/**
 * ReintentarEstudioForm — reintento de un estudio 'fallido' (o ejecución a mano
 * del que no arrancó solo tras la firma o el pago) con el documento
 * verificable/corregible en el lugar (la causa típica del fallo es una cédula
 * mal escrita o un tipo de documento no soportado). La central NO se elige
 * (CORR §2): la decide la cascada del motor, con DataCrédito como primaria.
 *
 * Compartido por EstudioEstadoCard (resumen) y EstudiosSection (tab Estudios).
 * El documento ya no se corrige aquí (BLQ §3.5): /ejecutar lo descarta, y el
 * del titular se corrige con «Corregir documento» (corrección ciega con la
 * fuente de verificación) y luego se reenvía el enlace. Solo el primer
 * apellido viaja como override.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconMail, IconPencil, IconRefresh } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import { autorizacionService } from '@/services/autorizacionService'
import { ApiClientError } from '@/lib/api'
import { CorregirDocumentoModal } from '@/components/expedientes/CorregirDocumentoModal'
import { EVENTO_BLOQUEOS } from '@/components/expedientes/BloqueosPendientesBanner'

// Tipos soportados por TransUnion Colombia (mismo set que el backend acepta
// en ejecutarEstudioBodySchema). Pasaporte se excluye a propósito: falla con
// 'tercero no existe' en las centrales locales. PPT/PEP (A13, migrantes):
// solo DataCrédito los consulta; TransUnion no tiene código para ellos.
export type TipoDocEstudio = 'cc' | 'nit' | 'ce' | 'ppt' | 'pep' | 'ti'

export function normalizeTipoDocEstudio(t?: string | null): TipoDocEstudio {
  const v = (t || '').toLowerCase()
  return v === 'cc' || v === 'nit' || v === 'ce' || v === 'ppt' || v === 'pep' || v === 'ti' ? v : 'cc'
}

/**
 * Un estudio completado, condicionado y SIN score significa que el buró no
 * pudo evaluar a la persona (código 14 de DataCrédito, exclusiones de
 * CreditVision). No es un perfil marginal: es falta de información, y lo
 * resuelve el analista en la revisión manual (ya no se re-consulta a mano
 * «el otro buró», CORR §2).
 */
export function esCondicionadoSinInfo(estudio: {
  estado: string
  resultado?: string | null
  score?: number | null
  sin_centrales?: boolean
}): boolean {
  // Caso L (ninguna central respondió) no es falta de información del buró.
  return estudio.estado === 'completado' && estudio.resultado === 'condicionado' && estudio.score == null && !estudio.sin_centrales
}

/**
 * Autorizado y listo pero nunca ejecutado: el arranque automático tras la
 * firma o el pago falló antes del lock (503 de pago, gate 8.4, documento) y el
 * timeline manda a ejecutarlo a mano. Mismos estados que la API acepta en
 * /ejecutar (ESTADOS_PERMITIDOS_EJECUCION), sin contar 'fallido'.
 */
export function esPendienteDeEjecutar(estudio: { estado: string }): boolean {
  return estudio.estado === 'formulario_completado' || estudio.estado === 'documentos_cargados'
}

/**
 * ¿Se puede relanzar este estudio? Compartido por la card del resumen y el
 * tab Estudios para que no se desincronicen.
 */
export function puedeRelanzarEstudio(estudio: { estado: string }): boolean {
  return estudio.estado === 'fallido' || esPendienteDeEjecutar(estudio)
}

/**
 * Propone el primer apellido a partir del nombre completo. En Colombia el
 * orden habitual es `Nombre1 [Nombre2] Apellido1 [Apellido2]`, así que con 4+
 * palabras el primer apellido es la antepenúltima y con 3 la penúltima.
 * Es solo una propuesta editable: DataCrédito lo contrasta contra la
 * Registraduría y basta un error para que la consulta falle con código 10.
 */
function proponerPrimerApellido(nombreCompleto?: string | null): string {
  const partes = (nombreCompleto || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  if (partes.length <= 2) return partes[partes.length - 1]
  if (partes.length === 3) return partes[1]
  return partes[partes.length - 2]
}

interface ReintentarEstudioFormProps {
  estudioId: string
  /** Documento actual del evaluado — se muestra para verificarlo. */
  persona?: {
    tipo_documento?: string | null
    numero_documento?: string | null
    /** Nombre completo — solo se usa para PROPONER el apellido si no viene. */
    nombre?: string | null
    /** Apellido ya separado. Si existe se usa tal cual (más fiable que derivarlo). */
    apellido?: string | null
  } | null
  /** true = titular (solo su documento se corrige desde aquí). */
  esTitular?: boolean
  /** Para corregir el documento y reenviar el enlace. Solo titular. */
  expedienteId?: string
  /** true cuando el estudio nunca se ejecutó (ver esPendienteDeEjecutar): el copy dice "ejecutar", no "reintentar". */
  esPrimeraEjecucion?: boolean
  /** Refresca la lista/card padre tras disparar el reintento. */
  onRetried?: () => void
}

export function ReintentarEstudioForm({
  estudioId,
  persona,
  esTitular = true,
  expedienteId,
  esPrimeraEjecucion = false,
  onRetried,
}: ReintentarEstudioFormProps) {
  const tipoDoc = normalizeTipoDocEstudio(persona?.tipo_documento)
  const numeroDoc = persona?.numero_documento?.trim() ?? ''
  const puedeCorregir = esTitular && !!expedienteId
  // undefined = cerrado; null = abierto sin conteo de correcciones.
  const [corregir, setCorregir] = useState<number | null | undefined>(undefined)
  // Si el apellido viene separado se usa tal cual; solo si no, se propone a
  // partir del nombre completo. En ambos casos queda editable: es lo que el
  // buró contrasta contra la Registraduría.
  const [primerApellido, setPrimerApellido] = useState(() => {
    const separado = persona?.apellido?.trim()
    if (separado) return separado.split(/\s+/)[0]
    return proponerPrimerApellido(persona?.nombre)
  })
  const [reintentando, setReintentando] = useState(false)
  // La persona firmó con otro documento: consultar el corregido exige que
  // vuelva a autorizar (Ley 1266), así que se ofrece enviarle el enlace.
  const [firmoOtroDocumento, setFirmoOtroDocumento] = useState(false)
  const [enviandoAutorizacion, setEnviandoAutorizacion] = useState(false)

  // DataCrédito (la central primaria) valida el apellido contra la
  // Registraduría, y únicamente cuando el documento es CC.
  const requiereApellido = tipoDoc === 'cc'

  const abrirCorregir = async () => {
    if (!expedienteId) return
    const aut = await autorizacionService.getStatus(expedienteId).catch(() => null)
    setCorregir(aut?.correcciones_restantes ?? null)
  }

  const handleReintentar = async () => {
    const apellido = primerApellido.trim()
    if (requiereApellido && apellido.length < 2) {
      toast.error('DataCrédito requiere el primer apellido para validar la identidad')
      return
    }
    setReintentando(true)
    try {
      await estudioService.ejecutarEstudio(estudioId, {
        // SOLO cuando el campo está visible: el backend trata cualquier
        // primer_apellido como corrección explícita y lo sincroniza en
        // solicitantes.apellido. Mandarlo con el campo oculto (CE/TI) pisaba en silencio un apellido compuesto
        // ('Pérez García' → 'Pérez') que el gestor nunca vio ni tocó.
        ...(requiereApellido && apellido ? { primer_apellido: apellido } : {}),
      })
      toast.success(`${esPrimeraEjecucion ? 'Ejecutando' : 'Reintentando'} la consulta…`)
      onRetried?.()
    } catch (err) {
      const motivo =
        err instanceof ApiClientError && err.code === 'AUTORIZACION_PREVIA_REQUERIDA'
          ? (err.details as unknown as { motivo?: string } | undefined)?.motivo
          : undefined
      if (motivo === 'documento_distinto' && esTitular && expedienteId) setFirmoOtroDocumento(true)
      toast.error(
        err instanceof Error
          ? err.message
          : `No se pudo ${esPrimeraEjecucion ? 'ejecutar' : 'reintentar'} la consulta.`,
      )
      // Refrescar también al fallar: el backend pudo haber tomado el lock
      // antes de romperse, y sin esto la card seguiría con el estado anterior.
      onRetried?.()
    } finally {
      setReintentando(false)
    }
  }

  const handleEnviarAutorizacion = async () => {
    if (!expedienteId) return
    setEnviandoAutorizacion(true)
    try {
      await autorizacionService.enviarEnlace(expedienteId)
      window.dispatchEvent(new Event(EVENTO_BLOQUEOS))
      toast.success('Enviamos la nueva autorización. Cuando la persona la firme, reintente la consulta.')
      setFirmoOtroDocumento(false)
      onRetried?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la autorización.')
    } finally {
      setEnviandoAutorizacion(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        {esPrimeraEjecucion
          ? 'Verifique el documento antes de ejecutar la consulta'
          : 'Verifique el documento antes de reintentar'}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-0 sm:min-w-[10rem]">
          <p className="block text-[11px] font-medium text-gray-500 mb-1">Documento</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-mono text-gray-900">
              {tipoDoc.toUpperCase()} {numeroDoc || '—'}
            </span>
            {puedeCorregir && (
              <button
                type="button"
                onClick={abrirCorregir}
                disabled={reintentando}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-50"
              >
                <IconPencil size={12} />
                Corregir documento
              </button>
            )}
          </div>
        </div>
        {/* Solo CC: es el único caso en que DataCrédito contrasta el apellido
            contra Registraduría (código 10 si no coincide). */}
        {requiereApellido && (
          <div className="sm:w-52">
            <label htmlFor="reintentar-estudio-form-primer-apellido" className="block text-[11px] font-medium text-gray-500 mb-1">
              Primer apellido
            </label>
            <input id="reintentar-estudio-form-primer-apellido"
              type="text"
              value={primerApellido}
              onChange={(e) => setPrimerApellido(e.target.value)}
              placeholder="Como en la Registraduría"
              disabled={reintentando}
              maxLength={80}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleReintentar}
          disabled={reintentando || numeroDoc.length < 5}
          className="inline-flex shrink-0 items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {reintentando ? <IconLoader size={14} className="animate-spin" /> : <IconRefresh size={14} />}
          {reintentando
            ? esPrimeraEjecucion
              ? 'Ejecutando…'
              : 'Reintentando…'
            : esPrimeraEjecucion
              ? 'Ejecutar consulta'
              : 'Reintentar consulta'}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mt-2">
        Solo se consultan documentos colombianos (CC, CE, TI, NIT).
        {requiereApellido
          ? ' DataCrédito valida el primer apellido contra la Registraduría: debe ir solo el primero, sin el segundo.'
          : ''}
        {puedeCorregir
          ? ' Si el documento está mal, corríjalo y reenvíe el enlace: el prospecto debe autorizar con el dato correcto.'
          : ''}
      </p>
      {firmoOtroDocumento && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">
            La persona autorizó la consulta con otro documento. Para consultar este, tiene que volver a
            autorizar: reenvíele el enlace. La autorización anterior queda como registro.
          </p>
          <button
            type="button"
            onClick={handleEnviarAutorizacion}
            disabled={enviandoAutorizacion}
            className="mt-2 inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {enviandoAutorizacion ? <IconLoader size={14} className="animate-spin" /> : <IconMail size={14} />}
            {enviandoAutorizacion ? 'Enviando…' : 'Reenviar el enlace de autorización'}
          </button>
        </div>
      )}
      {corregir !== undefined && expedienteId && (
        <CorregirDocumentoModal
          isOpen
          onClose={() => setCorregir(undefined)}
          expedienteId={expedienteId}
          tipoActual={persona?.tipo_documento}
          numeroActual={numeroDoc}
          correccionesRestantes={corregir}
          onCorregido={onRetried}
        />
      )}
    </div>
  )
}
