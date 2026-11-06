'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconCreditCard,
  IconDollarSign,
  IconLoader,
  IconMail,
  IconPencil,
  IconRefresh,
  IconShieldCheck,
} from '@/components/icons'
import { TarjetaSiguientePaso } from '@/components/expedientes/TarjetaSiguientePaso'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { pagoEstudioService, type IPagoEstudioEstado } from '@/services/pagoEstudioService'
import { estudioService } from '@/services/estudioService'
import type { IEstudio } from '@/types/estudio'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import { facturacionService, type IDatosFiscalesPagoFactura } from '@/services/facturacionService'
import { useAuthStore } from '@/stores/auth.store'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { MunicipioCombobox } from '@/components/registro/MunicipioCombobox'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

// Botones de la tarjeta: 40 px de alto, como las filas de Documentos.
const BOTON =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const BOTON_PRINCIPAL = 'bg-primary-700 text-white hover:bg-primary-800'
const BOTON_SECUNDARIO = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
const BOTON_FANTASMA = 'text-gray-700 hover:bg-gray-100'
// Una opción de «quién paga»: tarjeta pulsable con el texto a la izquierda.
const OPCION =
  'flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50'

const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/** Adenda de precios §1.2: al gestor, «base + IVA = total». */
function montoGestor(e: IPagoEstudioEstado): string {
  return e.iva > 0 ? `${fmtCOP(e.base)} + IVA ${fmtCOP(e.iva)} = ${e.monto_formateado} COP` : `${e.monto_formateado} COP`
}

/** Adenda de precios §1.2 (Ley 1480 art. 26): al prospecto, el total con el IVA incluido. */
function montoProspecto(e: IPagoEstudioEstado): string {
  return `${e.monto_formateado} COP${e.iva > 0 ? ' (IVA incluido)' : ''}`
}

/**
 * Tarjeta del estudio ya cubierto por la inmobiliaria. Con crédito del paquete
 * (Adenda de precios §2) el cupo se RESERVA al crear, se consume solo cuando la
 * central entrega el resultado y vuelve al saldo si la consulta no da
 * resultado: el texto sigue ese ciclo en vez de repetir el monto.
 * El pago con crédito se crea con metodo 'transferencia' y la descripción
 * «liberado con credito de inmobiliaria» (creditos-estudios.service del API).
 */
export function textoCubierto(
  e: Pick<IPagoEstudioEstado, 'autorizado' | 'monto_formateado' | 'pago' | 'cupo'>,
  estudio: Pick<IEstudio, 'estado'> | null,
  /** Cofianza mira el paquete de la inmobiliaria, no el suyo. */
  deLaInmobiliaria = false,
): { titulo: string; texto: string } {
  const r = textoCubiertoParaLaInmobiliaria(e, estudio)
  if (!deLaInmobiliaria) return r
  return {
    titulo: r.titulo.replace('a su saldo', 'al saldo de la inmobiliaria'),
    texto: r.texto
      .replace(/de su paquete/g, 'del paquete de la inmobiliaria')
      .replace(/a su paquete/g, 'al paquete de la inmobiliaria')
      .replace(/a su saldo/g, 'al saldo de la inmobiliaria'),
  }
}

function textoCubiertoParaLaInmobiliaria(
  e: Pick<IPagoEstudioEstado, 'autorizado' | 'monto_formateado' | 'pago' | 'cupo'>,
  estudio: Pick<IEstudio, 'estado'> | null,
): { titulo: string; texto: string } {
  const conCredito = !!e.cupo || /cr[eé]dito|cupo/i.test(`${e.pago?.descripcion ?? ''} ${e.pago?.notas ?? ''}`)
  if (!conCredito) {
    return {
      titulo: 'Cubierto por la inmobiliaria',
      texto: e.autorizado
        ? `${e.monto_formateado} COP. El prospecto ya autorizó la consulta.`
        : `${e.monto_formateado} COP. El enlace de autorización ya se envió al prospecto; el estudio inicia cuando lo firme.`,
    }
  }
  // La API dice el estado real del cupo; sin él (API anterior) se deduce del estudio del titular.
  const fase = e.cupo ?? (estudio?.estado === 'completado' ? 'consumido' : estudio?.estado === 'fallido' ? 'liberado' : 'reservado')
  if (fase === 'consumido') {
    return { titulo: 'Cupo consumido', texto: 'Se usó 1 cupo de su paquete: la central entregó el resultado.' }
  }
  if (fase === 'liberado') {
    return {
      titulo: 'Cupo devuelto a su saldo',
      texto: 'La consulta no dio resultado, así que el cupo volvió a su paquete. Si vuelve a consultar, se reserva otra vez.',
    }
  }
  return {
    titulo: 'Cupo reservado',
    texto: e.autorizado
      ? 'El prospecto ya autorizó la consulta. El cupo se consume cuando la central entregue el resultado del titular o del coarrendatario; si no lo entrega, vuelve a su saldo, salvo que el paquete ya haya vencido.'
      : 'Se reservó 1 cupo de su paquete. El estudio inicia cuando el prospecto autorice la consulta; si no se llega a consultar, el cupo vuelve a su saldo, salvo que el paquete ya haya vencido.',
  }
}

const ESTUDIO_CERRADO = ['completado', 'fallido', 'cancelado']

/**
 * Quién cubrió el estudio, siempre a la vista bajo el encabezado (revisión del
 * 26-oct): pasada la consulta, la tarjeta del pago se pliega en «Pasos
 * anteriores» o deja de mostrarse. Solo con el pago resuelto; antes lo dice la
 * tarjeta del Resumen.
 */
export function LineaPagoEstudio({
  expedienteId,
  estudioTitular,
  gestor,
  deLaInmobiliaria,
  version,
}: {
  expedienteId: string
  estudioTitular: Pick<IEstudio, 'estado'> | null
  /** Quien gestiona, como lo lee quien mira: «usted», «la inmobiliaria», «el propietario». */
  gestor: string
  deLaInmobiliaria: boolean
  /** Contador de cargas del detalle: se relee con cada cambio. */
  version: number
}) {
  const [estado, setEstado] = useState<IPagoEstudioEstado | null>(null)
  useEffect(() => {
    let cancel = false
    pagoEstudioService.getEstado(expedienteId).then(
      (e) => { if (!cancel) setEstado(e) },
      () => {},
    )
    return () => { cancel = true }
  }, [expedienteId, version])

  const texto = !estado
    ? null
    : estado.estado === 'asumido_inmobiliaria'
      ? textoCubierto(estado, estudioTitular, deLaInmobiliaria).titulo.toLowerCase()
      : estado.estado === 'completado'
        ? estado.paga === 'arrendatario' ? 'lo pagó el prospecto' : estado.paga === 'gestor' ? `lo pagó ${gestor}` : 'confirmado'
        : estado.estado === 'reembolsado'
          ? 'evaluación devuelta'
          : null
  if (!texto) return null
  // Un dato más de la ficha del encabezado (dt/dd dentro de su <dl>).
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500">Pago</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900 first-letter:uppercase">{texto}</dd>
    </div>
  )
}

interface PagoEstudioSectionProps {
  expedienteId: string
  onPagoCompletado?: () => void
  /** Rol del usuario actual — el solicitante ve un CTA "Pagar ahora" en lugar
   *  de los controles del gestor (enviar link / pagar él). */
  userRole?: string
  /** Si true, renderiza null cuando no hay acción relevante (sin_definir /
   *  cancelado). Útil para incluir la sección en el tab Resumen sin dejar
   *  un bloque vacío cuando el pago aún no aplica. */
  hideIfNoAction?: boolean
  /** Datos del solicitante del expediente — precargan el modal "Enviar link de
   *  pago al arrendatario" (el usuario igual puede editarlos antes de enviar). */
  solicitanteNombre?: string
  solicitanteEmail?: string
  solicitanteTelefono?: string | null
  /** Estudio sin propiedad: lo paga solo la persona estudiada (sin pasarela del gestor ni cupos). */
  sinInmueble?: boolean
}

export function PagoEstudioSection({ expedienteId, onPagoCompletado, userRole, hideIfNoAction, solicitanteNombre, solicitanteEmail, solicitanteTelefono, sinInmueble = false }: PagoEstudioSectionProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [estado, setEstado] = useState<IPagoEstudioEstado | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmLiberar, setConfirmLiberar] = useState(false)
  // Pagar con un cupo en lugar del cobro al prospecto (pendiente o fallido):
  // anula el enlace que ya recibió y reserva un cupo. Se confirma.
  const [confirmCancelarLiberar, setConfirmCancelarLiberar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // No se pudo LEER el estado (la primera vez): sin esto la tarjeta desaparecía
  // y el prospecto no veía ni "Pagar" ni un error.
  const [errorCarga, setErrorCarga] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [saldoCreditos, setSaldoCreditos] = useState<ISaldoCreditos | null>(null)
  const puedeUsarCreditos = userRole === 'inmobiliaria' && !sinInmueble
  // Opción B (Adenda 2 §7): el gestor paga él mismo por Mercado Pago. Ya no
  // existe "el costo queda a mi cargo" (a cuenta): no se aprobó. Adenda de
  // precios §1.4: la inmobiliaria no paga estudios sueltos (paquete o prospecto).
  // Cofianza no se paga a sí misma por la pasarela: el pago suelto es del propietario.
  const puedePagarSuelto = userRole === 'propietario' && !sinInmueble
  const numOpcionesPago = (puedeUsarCreditos ? 1 : 0) + (puedePagarSuelto ? 1 : 0) + 1
  // El checkout pendiente es de la agencia (opción B), no un enlace enviado al
  // prospecto: se ofrece reabrirlo en vez de "reenviar correo". Lo dice el API
  // (`paga`), no el correo de quien mira: otro miembro de la agencia veía el
  // cobro B como "Esperando pago del arrendatario" y se lo reenviaba al prospecto.
  const pagaGestor = estado?.paga === 'gestor'
  // B fallida → C: confirmación antes de pasarle el cobro al arrendatario.
  const [confirmPasarArrendatario, setConfirmPasarArrendatario] = useState(false)

  // Estudio del titular: solo para la tarjeta «cubierto» (reservado → consumido o devuelto).
  const [estudioTitular, setEstudioTitular] = useState<IEstudio | null>(null)

  const fetchEstado = useCallback(async () => {
    try {
      const data = await pagoEstudioService.getEstado(expedienteId)
      if (data.estado === 'asumido_inmobiliaria') {
        const lista = await estudioService.getEstudiosForExpediente(expedienteId, 1, 10).catch(() => null)
        const titular = lista?.data
          .filter((e) => e.tipo !== 'con_coarrendatario' && e.estado !== 'cancelado')
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
        if (lista) setEstudioTitular(titular ?? null)
      }
      setEstado(data)
      setErrorCarga(false)
    } catch {
      // Con un estado ya cargado se sigue mostrando el último.
      setErrorCarga(true)
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  const fetchSaldo = useCallback(async () => {
    if (!puedeUsarCreditos) return
    try {
      const data = await creditosEstudiosService.getMiSaldo()
      setSaldoCreditos(data)
    } catch {
      setSaldoCreditos(null)
    }
  }, [puedeUsarCreditos])

  useEffect(() => { fetchEstado() }, [fetchEstado, version])
  useEffect(() => { fetchSaldo() }, [fetchSaldo, version])

  // Polling automático mientras esperamos pago. Cuando el solicitante paga
  // por Mercado Pago, el webhook tarda 1-3 seg en marcar el pago como 'completado'
  // — sin esto el panel queda mostrando "pendiente" hasta que el usuario
  // refresque a mano. Polling cada 12 seg, solo en estados donde tiene sentido.
  // Cuando detectamos que ya no está pendiente, llamamos onPagoCompletado
  // para que el expediente padre haga refetch (estudio + UI).
  useEffect(() => {
    if (!estado) return
    // 'esperando_autorizacion' también es espera: cuando el arrendatario firme,
    // el backend le genera el cobro solo y este panel tiene que enterarse.
    const enEspera =
      estado.estado === 'pendiente' || estado.estado === 'procesando' || estado.estado === 'esperando_autorizacion'
    if (!enEspera) return

    const id = setInterval(async () => {
      if (document.hidden) return // pestaña oculta: no se pregunta
      const fresco = await pagoEstudioService.getEstado(expedienteId).catch(() => null)
      if (!fresco) return
      setEstado(fresco)
      if (fresco.estado !== 'pendiente' && fresco.estado !== 'procesando' && fresco.estado !== 'esperando_autorizacion') {
        onPagoCompletado?.()
      }
    }, 12000)
    return () => clearInterval(id)
  }, [estado, expedienteId, onPagoCompletado])

  // Cubierto con crédito: el texto cambia cuando el prospecto autoriza y
  // cuando la central responde, sin que nadie recargue la página.
  const esperaCubierto =
    estado?.estado === 'asumido_inmobiliaria' && !(estudioTitular && ESTUDIO_CERRADO.includes(estudioTitular.estado))
  useEffect(() => {
    if (!esperaCubierto) return
    const id = setInterval(() => {
      if (!document.hidden) void fetchEstado()
    }, 15000)
    return () => clearInterval(id)
  }, [esperaCubierto, fetchEstado])

  // P22: el saldo en contra (compra contracargada) se resta de lo disponible;
  // se ofrece crédito solo si queda saldo efectivo (si no, la API da 409).
  const creditosEnContra = saldoCreditos?.creditos_en_contra ?? 0
  const saldoUsable = saldoCreditos?.saldo_efectivo ?? saldoCreditos?.saldo_total ?? 0
  const hayCreditosUsables = saldoUsable > 0

  const handleLiberarCredito = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await creditosEstudiosService.liberarEstudio(expedienteId)
      await Promise.all([fetchEstado(), fetchSaldo()])
      toast.success(
        estado?.autorizado
          ? 'Cupo reservado. La evaluación inicia de inmediato.'
          : 'Cupo reservado. La evaluación inicia cuando el prospecto autorice la consulta.',
      )
      onPagoCompletado?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo pagar el estudio con un cupo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Opción B: abre el checkout de Mercado Pago. Al volver, /pago/resultado
  // concilia el pago y trae al gestor de vuelta a este estudio.
  const handlePagar = async (reemplazarPendiente = false) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const pago = await pagoEstudioService.pagar(expedienteId, reemplazarPendiente)
      if (!pago.payment_link_url) throw new Error('La pasarela no devolvió el enlace de pago. Intente de nuevo.')
      window.location.assign(pago.payment_link_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el pago')
      setIsSubmitting(false)
    }
  }

  // B fallida → C: el API cierra el checkout fallido de la agencia y le manda al
  // arrendatario la autorización (el cobro le llega al firmarla). Sin sus datos
  // en el estudio, el formulario de siempre los pide.
  const handlePasarAlArrendatario = async () => {
    if (!solicitanteEmail || !solicitanteNombre) {
      setShowLinkModal(true)
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await pagoEstudioService.enviarLink(expedienteId, {
        email_pagador: solicitanteEmail,
        nombre_pagador: solicitanteNombre,
        telefono: solicitanteTelefono || undefined,
      })
      toast.success('Listo: el cobro de la evaluación pasa al arrendatario.')
      await fetchEstado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo pasar el cobro al arrendatario')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Email corregido para el reenvío del link. null = no está editando (el
  // reenvío va al email guardado). Un email mal escrito no debe ser callejón
  // sin salida: /enviar-link responde 409 mientras haya un pago pendiente.
  const [reenviarEmail, setReenviarEmail] = useState<string | null>(null)

  const handleReenviar = async () => {
    const emailNuevo = reenviarEmail?.trim().toLowerCase()
    if (reenviarEmail !== null && (!emailNuevo || !/.+@.+\..+/.test(emailNuevo))) {
      setError('Ingrese un correo válido para reenviar el enlace')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const registrado = (estado?.pago?.email_pagador ?? '').toLowerCase()
      await pagoEstudioService.reenviar(
        expedienteId,
        emailNuevo && emailNuevo !== registrado ? { email_pagador: emailNuevo } : undefined,
      )
      setError(null)
      setReenviarEmail(null)
      await fetchEstado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el enlace')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Inmobiliaria: el "cancelar" del estado pendiente cobra con un cupo (no asume gratis).
  const handleCancelarYLiberar = async () => {
    setIsSubmitting(true)
    setError(null)
    const quedan = saldoUsable - 1
    try {
      await pagoEstudioService.cancelarYLiberarCredito(expedienteId)
      await Promise.all([fetchEstado(), fetchSaldo()])
      toast.success(`Se reservó 1 cupo; le ${quedan === 1 ? 'queda 1' : `quedan ${quedan}`}.`)
      onPagoCompletado?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo pagar el estudio con un cupo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Inmobiliaria paga con un cupo; los demás (propietario/admin) pagan ellos
  // mismos por Mercado Pago (opción B).
  const cancelarConCredito = userRole === 'inmobiliaria'
  const onCancelar = cancelarConCredito ? () => setConfirmCancelarLiberar(true) : () => { void handlePagar(true) }
  const labelCancelar = cancelarConCredito
    ? 'Pagar con un cupo del paquete en lugar del prospecto'
    : 'Cancelar y pagar yo (Mercado Pago)'

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <span className="sr-only">Cargando el estado del pago…</span>
        <Skeleton className="h-5 w-48 max-w-full" />
        <SkeletonText lineas={2} />
      </div>
    )
  }

  if (!estado) {
    if (!errorCarga) return null
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">No pudimos consultar el estado del pago del estudio.</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true)
            void fetchEstado()
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }

  // ── Vista solicitante ─────────────────────────────────────────────────
  // El solicitante no puede "pagar por el gestor" ni "enviar link". Solo paga si hay
  // link de Mercado Pago generado, o espera a que definan la forma de pago.
  if (userRole === 'solicitante') {
    if (hideIfNoAction && (estado.estado === 'sin_definir' || estado.estado === 'cancelado' || estado.estado === 'esperando_autorizacion')) {
      return null
    }
    return <PagoEstudioSolicitanteView estado={estado} />
  }

  // Monto como frase suelta: sin monto no queda un «COP —» colgando.
  const montoCOP = estado.monto_formateado ? `${estado.monto_formateado} COP` : null
  const emailEnlace = estado.pago?.email_pagador || null
  const confirmLiberarDialog = (
    <ConfirmDialog
      isOpen={confirmLiberar}
      onClose={() => setConfirmLiberar(false)}
      onConfirm={() => {
        setConfirmLiberar(false)
        return handleLiberarCredito()
      }}
      isLoading={isSubmitting}
      title="Pagar con un cupo"
      message={`Se reserva 1 cupo de su paquete (${saldoUsable} disponibles) y la evaluación inicia ${estado.autorizado ? 'de inmediato' : 'cuando el prospecto autorice la consulta'}. Se descuenta solo si la central entrega el resultado; si no, vuelve a su saldo.`}
      confirmLabel="Reservar 1 cupo"
    />
  )

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {/* Sin definir — mostrar selector (acción requerida) */}
      {estado.estado === 'sin_definir' && (
        <TarjetaSiguientePaso
          tono="revision"
          icono={<IconAlertTriangle size={18} />}
          titulo={
            <>
              Acción requerida: defina quién paga el estudio
              <InfoTip texto={AYUDA.pago} className="ml-1" />
            </>
          }
          descripcion={
            <>
              La evaluación crediticia <span className="font-semibold">no puede ejecutarse</span> hasta que elija una de
              estas opciones.{montoCOP && <> Monto: <span className="font-semibold text-gray-900">{montoGestor(estado)}</span>.</>}
            </>
          }
        >
          <div className={cn('grid grid-cols-1 gap-3 px-4 py-4 sm:px-5', numOpcionesPago >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            {/* Liberar con credito (inmobiliaria) */}
            {puedeUsarCreditos && (
              hayCreditosUsables ? (
                <>
                  {confirmLiberarDialog}
                  <button
                    type="button"
                    onClick={() => setConfirmLiberar(true)}
                    disabled={isSubmitting}
                    className={cn(OPCION, 'border-primary-300 hover:border-primary-500 hover:bg-primary-50')}
                  >
                    <IconShieldCheck size={22} className="shrink-0 text-primary-700" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">Pagar con un cupo</span>
                      <span className="mt-0.5 block text-xs font-medium text-primary-800">Saldo: {saldoUsable} {saldoUsable === 1 ? 'cupo' : 'cupos'}</span>
                      <span className="mt-1 block text-xs leading-snug text-gray-600">{estado.autorizado ? 'Reserva 1 cupo y el proceso sigue de inmediato.' : 'Reserva 1 cupo; el proceso sigue cuando el prospecto autorice.'}</span>
                    </span>
                  </button>
                </>
              ) : (
                <Link href="/configuracion/creditos-estudios" className={cn(OPCION, 'border-amber-300 hover:border-amber-500 hover:bg-amber-50')}>
                  <IconDollarSign size={22} className="shrink-0 text-amber-700" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">Comprar paquete</span>
                    <span className="mt-0.5 block text-xs font-medium text-amber-900">
                      {creditosEnContra > 0 ? `${creditosEnContra} en contra` : 'Sin cupos disponibles'}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-gray-600">
                      {creditosEnContra > 0
                        ? 'Una compra se reversó con el banco: lo usado se descuenta de su próxima compra.'
                        : 'Compre un paquete de cupos con descuento por volumen.'}
                    </span>
                  </span>
                </Link>
              )
            )}
            {puedePagarSuelto && (
              <button type="button" onClick={() => { void handlePagar() }} disabled={isSubmitting} className={cn(OPCION, 'hover:border-primary-500 hover:bg-primary-50/50')}>
                <IconCreditCard size={22} className="shrink-0 text-primary-700" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">Pagar ahora con Mercado Pago</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Tarjeta o PSE</span>
                  <span className="mt-1 block text-xs leading-snug text-gray-600">El estudio sigue cuando se confirma el pago.</span>
                </span>
              </button>
            )}
            <button type="button" onClick={() => setShowLinkModal(true)} disabled={isSubmitting} className={cn(OPCION, 'hover:border-primary-500 hover:bg-primary-50/50')}>
              <IconMail size={22} className="shrink-0 text-primary-700" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">Enviar enlace al arrendatario</span>
                <span className="mt-0.5 block text-xs text-gray-600">Él paga con tarjeta o PSE</span>
                <span className="mt-1 block text-xs leading-snug text-gray-600">
                  {estado.autorizado
                    ? 'Ya autorizó la consulta: le enviamos el cobro.'
                    : 'Primero le pedimos la autorización; el cobro le llega apenas la firme.'}
                </span>
              </span>
            </button>
          </div>
        </TarjetaSiguientePaso>
      )}

      {/* Opción C antes de la autorización (§6.3). Todavía no hay fila de
          pago: el cobro se le genera al autorizar. La espera ya la dicen la
          tarjeta del estado y la de autorización; aquí va solo lo del cobro.
          Los escapes siguen disponibles porque no hay link vivo que cancelar. */}
      {estado.estado === 'esperando_autorizacion' && (
        <TarjetaSiguientePaso
          tono="revision"
          icono={<IconClock size={18} />}
          titulo={montoCOP ? `Cobro al prospecto: ${montoGestor(estado)}` : 'Cobro al prospecto'}
          descripcion="Le llega apenas autorice la consulta, y la evaluación corre cuando el pago se confirme."
        >
          {((puedeUsarCreditos && hayCreditosUsables) || puedePagarSuelto) && (
            <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
              {puedeUsarCreditos && hayCreditosUsables && (
                <>
                  {confirmLiberarDialog}
                  <button type="button" onClick={() => setConfirmLiberar(true)} disabled={isSubmitting} className={cn(BOTON, BOTON_SECUNDARIO)}>
                    <IconShieldCheck size={16} />
                    Pagar con un cupo del paquete
                  </button>
                </>
              )}
              {puedePagarSuelto && (
                <button type="button" onClick={() => { void handlePagar() }} disabled={isSubmitting} className={cn(BOTON, BOTON_SECUNDARIO)}>
                  <IconCreditCard size={16} />
                  Pagar yo con Mercado Pago
                </button>
              )}
            </div>
          )}
        </TarjetaSiguientePaso>
      )}

      {/* Asumido por inmobiliaria */}
      {estado.estado === 'asumido_inmobiliaria' && (() => {
        const { titulo, texto } = textoCubierto(estado, estudioTitular, userRole !== 'inmobiliaria')
        return (
          <TarjetaSiguientePaso
            tono="accion"
            icono={<IconCheckCircle size={18} />}
            titulo={
              <span className="inline-flex items-center gap-1">
                {titulo}
                <InfoTip texto={/cupo/i.test(titulo) ? AYUDA.cupo : AYUDA.pago} lado="derecha" />
              </span>
            }
            descripcion={texto}
          />
        )
      })()}

      {/* P1: la evaluación se devolvió. El API no manda el motivo (estudio sin
          consulta, contracargo, reembolso a mano): el texto no lo supone. */}
      {estado.estado === 'reembolsado' && (
        <TarjetaSiguientePaso
          tono="neutro"
          icono={<IconRefresh size={18} />}
          titulo="Evaluación devuelta"
          descripcion={montoCOP ? `Esta evaluación de ${montoCOP} se devolvió.` : 'Esta evaluación se devolvió.'}
        />
      )}

      {/* Completado (via pasarela) */}
      {estado.estado === 'completado' && (
        <TarjetaSiguientePaso
          tono="accion"
          icono={<IconCheckCircle size={18} />}
          titulo="Pago confirmado"
          descripcion={`${montoCOP ? `${montoCOP}. ` : ''}La evaluación crediticia ya puede ejecutarse.`}
        />
      )}

      {/* Pendiente — checkout del propio gestor (opción B) */}
      {estado.estado === 'pendiente' && pagaGestor && (
        <TarjetaSiguientePaso
          tono="revision"
          icono={<IconClock size={18} />}
          titulo="Su pago está pendiente en Mercado Pago"
          descripcion={`${montoCOP ? `${montoCOP}. ` : ''}El estudio sigue cuando se confirme.`}
        >
          {estado.pago?.payment_link_url && (
            <div className="px-4 py-4 sm:px-5">
              <a href={estado.pago.payment_link_url} className={cn(BOTON, BOTON_PRINCIPAL)}>
                <IconCreditCard size={16} />
                Abrir Mercado Pago
              </a>
            </div>
          )}
        </TarjetaSiguientePaso>
      )}

      {/* Pendiente — enlace enviado al arrendatario */}
      {estado.estado === 'pendiente' && !pagaGestor && (
        <TarjetaSiguientePaso
          tono="revision"
          icono={<IconClock size={18} />}
          titulo={estado.autorizado ? 'Ya autorizó: esperando su pago' : 'Esperando el pago del arrendatario'}
          descripcion={
            montoCOP || emailEnlace ? (
              <>
                {montoCOP && <span className="font-semibold text-gray-900">{montoCOP}</span>}
                {montoCOP && emailEnlace && '. '}
                {emailEnlace && (
                  <>
                    Enlace enviado a <span className="break-words font-medium text-gray-900">{emailEnlace}</span>
                  </>
                )}
                .
              </>
            ) : (
              'El enlace de pago ya se envió al arrendatario.'
            )
          }
        >
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {/* Corregir el email destino: el mismo link se reenvía al corregido
                (no se puede re-crear el link mientras el pago siga pendiente). */}
            {reenviarEmail !== null && (
              <div className="max-w-sm">
                <label htmlFor="pago-reenviarEmail" className="mb-1 block text-sm font-medium text-gray-800">
                  Correo destino corregido
                </label>
                <input
                  id="pago-reenviarEmail"
                  type="email"
                  value={reenviarEmail}
                  onChange={(e) => setReenviarEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="correo@ejemplo.com"
                  className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleReenviar}
                disabled={isSubmitting}
                className={cn(BOTON, reenviarEmail !== null ? BOTON_PRINCIPAL : BOTON_SECUNDARIO)}
              >
                {isSubmitting ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
                {reenviarEmail !== null ? 'Reenviar al correo corregido' : 'Reenviar correo'}
              </button>
              {reenviarEmail === null ? (
                <button
                  type="button"
                  onClick={() => setReenviarEmail(estado.pago?.email_pagador ?? '')}
                  disabled={isSubmitting}
                  className={cn(BOTON, BOTON_SECUNDARIO)}
                >
                  <IconPencil size={16} />
                  Corregir correo
                </button>
              ) : (
                <button type="button" onClick={() => setReenviarEmail(null)} disabled={isSubmitting} className={cn(BOTON, BOTON_FANTASMA)}>
                  Cancelar corrección
                </button>
              )}
              {cancelarConCredito && !hayCreditosUsables ? (
                // Sin saldo la API lo rechaza (SIN_CREDITOS): no se ofrece.
                <span className="text-sm text-gray-600">Sin cupos disponibles para pagarlo con el paquete.</span>
              ) : (
                <button type="button" onClick={onCancelar} disabled={isSubmitting} className={cn(BOTON, BOTON_SECUNDARIO, 'text-left')}>
                  {labelCancelar}
                </button>
              )}
            </div>
          </div>
        </TarjetaSiguientePaso>
      )}

      {/* Procesando — PSE/efectivo en proceso en la pasarela */}
      {estado.estado === 'procesando' && (
        <TarjetaSiguientePaso
          tono="neutro"
          icono={<IconLoader size={18} className="animate-spin" />}
          titulo="Pago en proceso"
          descripcion={
            <>
              {montoCOP && `${montoCOP}. `}El pago se inició (PSE o efectivo) y se confirma automáticamente.{' '}
              {/* Sin "cancelar": el PSE o el recibo de efectivo ya salió y
                  cancelarlo cobraría el estudio dos veces (el API responde 409). */}
              Si el pago vence, podrá {cancelarConCredito ? 'pagarlo con un cupo del paquete' : 'pagarlo usted'}.
            </>
          }
        />
      )}

      {/* Fallido */}
      {estado.estado === 'fallido' && (
        <TarjetaSiguientePaso
          tono="alerta"
          icono={<IconAlertTriangle size={18} />}
          titulo={pagaGestor ? 'Su pago en Mercado Pago falló' : 'Pago fallido'}
          descripcion={montoCOP ?? undefined}
        >
          <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
            {pagaGestor ? (
              <>
                {/* Opción B: el cobro fallido es de la agencia. Lo principal es
                    reintentarlo; pasárselo al arrendatario es otra decisión (la C)
                    y se confirma aparte. */}
                {puedePagarSuelto && (
                  <button type="button" onClick={() => { void handlePagar() }} disabled={isSubmitting} className={cn(BOTON, BOTON_PRINCIPAL)}>
                    <IconCreditCard size={16} />
                    Pagar de nuevo
                  </button>
                )}
                <button type="button" onClick={() => setConfirmPasarArrendatario(true)} disabled={isSubmitting} className={cn(BOTON, BOTON_SECUNDARIO)}>
                  Mejor que pague el arrendatario
                </button>
                <ConfirmDialog
                  isOpen={confirmPasarArrendatario}
                  onClose={() => setConfirmPasarArrendatario(false)}
                  onConfirm={handlePasarAlArrendatario}
                  isLoading={isSubmitting}
                  title="¿Pasarle el cobro al arrendatario?"
                  message={`Se cierra su pago fallido y le enviamos al arrendatario${solicitanteEmail ? ` (${solicitanteEmail})` : ''} la autorización de la consulta. Apenas la firme le llega el cobro${montoCOP ? ` de ${montoCOP}` : ''}, y la evaluación corre cuando lo pague.`}
                  confirmLabel="Sí, que pague el arrendatario"
                  cancelLabel="Volver"
                />
              </>
            ) : (
              <>
                <button type="button" onClick={() => setShowLinkModal(true)} disabled={isSubmitting} className={cn(BOTON, BOTON_PRINCIPAL)}>
                  <IconMail size={16} />
                  Reenviar enlace
                </button>
                {puedePagarSuelto && (
                  <button type="button" onClick={() => { void handlePagar() }} disabled={isSubmitting} className={cn(BOTON, BOTON_SECUNDARIO)}>
                    <IconCreditCard size={16} />
                    Pagar yo con Mercado Pago
                  </button>
                )}
              </>
            )}
            {/* El API cierra el cobro fallido (su link seguía pagable) y reserva el cupo. */}
            {cancelarConCredito && hayCreditosUsables && (
              <button type="button" onClick={() => setConfirmCancelarLiberar(true)} disabled={isSubmitting} className={cn(BOTON, BOTON_SECUNDARIO)}>
                {labelCancelar}
              </button>
            )}
          </div>
        </TarjetaSiguientePaso>
      )}

      <ConfirmDialog
        isOpen={confirmCancelarLiberar}
        onClose={() => setConfirmCancelarLiberar(false)}
        onConfirm={handleCancelarYLiberar}
        isLoading={isSubmitting}
        title="Pagar con un cupo"
        message={`Se anula el enlace de pago enviado${estado.pago?.email_pagador ? ` a ${estado.pago.email_pagador}` : ' al prospecto'} y se reserva 1 cupo de su paquete (${saldoUsable} disponibles). Se descuenta solo si la central entrega el resultado; si no, vuelve a su saldo.`}
        confirmLabel="Reservar 1 cupo"
        cancelLabel="Volver"
      />

      {/* Modal: enviar link al arrendatario */}
      <EnviarLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        expedienteId={expedienteId}
        montoFormateado={montoGestor(estado)}
        defaultNombre={solicitanteNombre}
        defaultEmail={solicitanteEmail}
        defaultTelefono={solicitanteTelefono}
        autorizado={!!estado.autorizado}
        onSuccess={async () => {
          // Se espera la recarga antes de cerrar: el botón no se suelta con el estado viejo.
          await fetchEstado()
          setShowLinkModal(false)
        }}
      />
    </div>
  )
}

// ============================================
// Modal: Enviar link de pago
// ============================================

function EnviarLinkModal({
  isOpen,
  onClose,
  expedienteId,
  montoFormateado,
  defaultNombre,
  defaultEmail,
  defaultTelefono,
  autorizado,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  montoFormateado: string
  defaultNombre?: string
  defaultEmail?: string
  defaultTelefono?: string | null
  /** El titular ya autorizó: solo se envía el cobro y los datos no tocan la ficha. */
  autorizado: boolean
  onSuccess: () => void | Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Precargar con los datos del solicitante del expediente cada vez que se abre
  // el modal. Son editables antes de enviar.
  useEffect(() => {
    if (isOpen) {
      setNombre(defaultNombre ?? '')
      setEmail(defaultEmail ?? '')
      setTelefono(defaultTelefono ?? '')
      setError(null)
    }
  }, [isOpen, defaultNombre, defaultEmail, defaultTelefono])

  const resetForm = useCallback(() => {
    setEmail('')
    setNombre('')
    setTelefono('')
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }, [isSubmitting, resetForm, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)

    // Antes de autorizar el nombre no se usa (sale el de la ficha): no se exige.
    if ((autorizado && !nombre.trim()) || !email.trim()) {
      setError(autorizado ? 'Escriba el nombre y el correo del arrendatario.' : 'Escriba el correo del arrendatario.')
      return
    }

    setIsSubmitting(true)
    try {
      const r = await pagoEstudioService.enviarLink(expedienteId, {
        email_pagador: email,
        // La API lo exige aunque antes de autorizar no lo use.
        nombre_pagador: nombre.trim() || email,
        telefono: telefono || undefined,
      })
      if ('ficha_no_actualizada' in r && r.ficha_no_actualizada) {
        toast.warning('No pudimos actualizar la ficha; el cobro posterior podría ir al contacto anterior.')
      }
      await onSuccess()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace. Intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enviar al arrendatario"
      description={
        autorizado
          ? 'Ya autorizó la consulta en centrales: le enviamos el cobro.'
          : 'Primero recibe el enlace para autorizar la consulta en centrales; apenas lo firme, le llega el cobro.'
      }
      size="md"
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button type="submit" form="enviar-enlace-arrendatario-form" disabled={isSubmitting} aria-busy={isSubmitting || undefined} className={botonModal('primary')}>
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {isSubmitting ? 'Enviando…' : 'Enviar al arrendatario'}
            </button>
          </ModalAcciones>
        </div>
      }
    >
      <form id="enviar-enlace-arrendatario-form" noValidate onSubmit={handleSubmit} className="space-y-4">
        {/* §6.3: lo primero que recibe el arrendatario es la AUTORIZACIÓN.
            El cobro se le genera y se le envía cuando la firme. */}
        <dl className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-600">Concepto</dt>
            <dd className="font-medium text-gray-900">Evaluación crediticia</dd>
          </div>
          <div>
            <dt className="text-gray-600">Monto</dt>
            <dd className="font-medium tabular-nums text-gray-900">{montoFormateado}</dd>
          </div>
        </dl>
        <p className="text-sm text-gray-600">
          {autorizado
            ? 'Enviaremos el cobro a este correo y WhatsApp. Ya autorizó la consulta: estos datos se usan solo para este cobro y no cambian su ficha.'
            : 'Enviaremos la autorización y el cobro a este correo y WhatsApp. Si los corrige aquí, también se actualiza la ficha del arrendatario.'}
        </p>

        <div>
          <label htmlFor="pago-nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del arrendatario {autorizado && <span className="text-red-600" aria-hidden="true">*</span>}
          </label>
          <input id="pago-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            autoComplete="off"
            readOnly={!autorizado}
            aria-describedby={autorizado ? undefined : 'pago-nombre-ayuda'}
            className={cn(
              'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              !autorizado && 'bg-gray-50 text-gray-700',
            )}
            disabled={isSubmitting}
          />
          {!autorizado && (
            <p id="pago-nombre-ayuda" className="mt-1 text-xs text-gray-600">
              El nombre no cambia la ficha: si está mal escrito, corríjalo después del envío con «Corregir datos» en la
              sección de autorización del estudio, antes de que la persona autorice.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="pago-email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo del arrendatario <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input id="pago-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <PhoneInput
            label="WhatsApp (opcional)"
            value={telefono}
            onChange={setTelefono}
            placeholder="300 123 4567"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-600">Si lo deja vacío, usamos el WhatsApp registrado en la ficha.</p>
        </div>
      </form>
    </Modal>
  )
}

// ============================================
// Vista para el solicitante: ver estado + pagar
// ============================================

function PagoEstudioSolicitanteView({ estado }: { estado: IPagoEstudioEstado }) {
  const linkPago = estado.pago?.payment_link_url || null
  const pagoId = estado.pago?.id || null
  // Solo "recibimos tu pago" (y su factura) si pagó él: en la opción B el pago
  // lo hace el gestor con su correo y el estado igual es 'completado'.
  const pagoPropio = estado.estado === 'completado' && estado.paga === 'arrendatario'
  // Si el backend ya adjunto la factura al pago (attachFacturas), la usamos.
  const facturaExistente = (estado.pago as unknown as { factura?: { id: string; numero?: string | null; estado: string } | null } | null)?.factura || null

  const [facturaModal, setFacturaModal] = useState<{
    faltantes: string[]
    datos: IDatosFiscalesPagoFactura
  } | null>(null)
  /** Modal de confirmacion previo a emitir: muestra los datos que se usaran
   *  para que el solicitante verifique o ajuste antes de tocar Factus. */
  const [confirmModal, setConfirmModal] = useState<{
    datos: {
      nombre_completo: string
      tipo_documento: string
      numero_documento: string
      email: string
      telefono: string
      direccion: string
      municipio_codigo: string
      municipio_nombre: string
    }
    monto: number
  } | null>(null)
  const [facturando, setFacturando] = useState(false)
  const [facturaIdEmitida, setFacturaIdEmitida] = useState<string | null>(facturaExistente?.id || null)

  // Sincronizar el state local cuando el backend reporta una factura emitida.
  // Sin este efecto, useState(facturaExistente?.id) solo evalua al montar — si
  // estado.pago.factura llega despues del primer render (lo normal: el padre
  // hace fetch async), el boton seguia mostrando "Facturar" hasta que el usuario
  // lo presionaba y recibia "La factura ya estaba emitida". Ahora la UI se
  // ajusta sola en cuanto el backend trae el dato.
  useEffect(() => {
    if (facturaExistente?.id && facturaExistente.id !== facturaIdEmitida) {
      setFacturaIdEmitida(facturaExistente.id)
    }
  }, [facturaExistente?.id, facturaIdEmitida])

  const tryFacturar = async (datos?: IDatosFiscalesPagoFactura): Promise<boolean> => {
    if (!pagoId) return false
    try {
      const factura = await facturacionService.facturarPago(pagoId, datos)
      toast.success(`Factura emitida${factura.numero ? `: ${factura.numero}` : ''}`)
      setFacturaIdEmitida(factura.id)
      setFacturaModal(null)
      setConfirmModal(null)
      return true
    } catch (err: unknown) {
      const e = err as { code?: string; details?: { faltantes?: string[] }; message?: string }
      if (e.code === 'CLIENTE_DATOS_INCOMPLETOS' && Array.isArray(e.details?.faltantes)) {
        setFacturaModal({ faltantes: e.details!.faltantes!, datos: datos || {} })
        setConfirmModal(null)
        return false
      }
      toast.error(e.message || 'Error al emitir la factura')
      return false
    }
  }

  // Click inicial: pide preview al backend y abre modal de confirmacion.
  // Si faltan datos, redirige al solicitante a /facturacion para que los
  // complete (la pantalla dedicada es la fuente de verdad). Para otros
  // roles abrimos el form inline como antes.
  const handleFacturarClick = async () => {
    if (!pagoId) return
    setFacturando(true)
    try {
      const preview = await facturacionService.previewFacturaPago(pagoId)
      if (preview.ya_emitida && preview.factura_id) {
        setFacturaIdEmitida(preview.factura_id)
        toast.message('La factura ya estaba emitida.')
        return
      }
      // Adenda 2 §7, opción B: el estudio lo pagó la inmobiliaria (o el
      // propietario). La factura va a su nombre y no la emite el solicitante.
      if (preview.a_nombre_de_quien_pago || !preview.datos_actuales) {
        toast.message('Este estudio lo pagó quien le arrienda: la factura sale a nombre de quien pagó.')
        return
      }
      if (preview.faltantes.length > 0) {
        toast.error(
          'Complete sus datos fiscales en Facturación → Datos Fiscales antes de emitir la factura.',
        )
        // Damos un beat para que el toast se vea antes de navegar.
        setTimeout(() => {
          window.location.href = '/facturacion#datos-fiscales'
        }, 600)
        return
      }
      // Datos completos: abrir modal de confirmacion para que verifique.
      setConfirmModal({ datos: preview.datos_actuales, monto: preview.monto })
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'No pudimos cargar los datos de facturacion')
    } finally {
      setFacturando(false)
    }
  }

  const handleConfirmEmitir = async () => {
    setFacturando(true)
    try {
      // Sin datos -> backend usa los del solicitante (mismos del preview).
      await tryFacturar()
    } finally {
      setFacturando(false)
    }
  }

  const handleAjustarDesdeConfirm = () => {
    // Permite editar los datos antes de emitir. Usamos FacturaModal con
    // todos los campos como "faltantes" para que el form los muestre todos.
    if (!confirmModal) return
    setFacturaModal({
      faltantes: ['numero_documento', 'email', 'telefono', 'direccion', 'municipio_codigo'],
      datos: {
        numero_documento: confirmModal.datos.numero_documento,
        tipo_documento: confirmModal.datos.tipo_documento,
        nombre_completo: confirmModal.datos.nombre_completo,
        direccion: confirmModal.datos.direccion,
        email: confirmModal.datos.email,
        telefono: confirmModal.datos.telefono,
        municipio_codigo: confirmModal.datos.municipio_codigo,
      },
    })
    setConfirmModal(null)
  }

  const handleSubmitFacturaModal = async () => {
    if (!facturaModal) return
    setFacturando(true)
    try {
      await tryFacturar(facturaModal.datos)
    } finally {
      setFacturando(false)
    }
  }

  // Pago completado → banner verde + boton "Facturar".
  if (estado.estado === 'completado' || estado.estado === 'asumido_inmobiliaria') {
    return (
      <>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <IconCheckCircle size={20} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">
                {pagoPropio
                  ? '¡Pago confirmado!'
                  : estado.estado === 'asumido_inmobiliaria'
                    ? 'Costo cubierto por la inmobiliaria'
                    : 'Costo de la evaluación cubierto'}
              </p>
              <p className="text-xs text-green-600">
                {estado.monto_formateado} COP — {pagoPropio ? 'Recibimos su pago correctamente.' : 'El costo de la evaluación ya está cubierto.'}
              </p>
            </div>
          </div>

          {/* Acciones de facturacion — solo si fue un pago propio (no asumido) y hay pagoId */}
          {pagoPropio && pagoId && (
            <div className="mt-3 pt-3 border-t border-green-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-green-700">
                {facturaIdEmitida || facturaExistente
                  ? '¿Necesita su factura electrónica?'
                  : '¿Necesita factura electrónica de este pago?'}
              </p>
              {facturaIdEmitida || facturaExistente ? (
                <Link
                  href={`/facturacion/${facturaIdEmitida || facturaExistente!.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-800 bg-white border border-green-300 rounded-md hover:bg-green-50 transition"
                >
                  Ver factura
                  <IconArrowRight size={14} />
                </Link>
              ) : (
                <button
                  onClick={handleFacturarClick}
                  disabled={facturando}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {facturando && (
                    <IconLoader size={14} className="animate-spin" />
                  )}
                  Facturar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal pidiendo datos fiscales que falten */}
        <Modal
          isOpen={!!facturaModal}
          onClose={() => !facturando && setFacturaModal(null)}
          title="Datos fiscales para su factura"
          description="Faltan algunos datos para emitir la factura electrónica ante la DIAN. Solo se usan en esta factura."
          size="md"
          footer={
            <ModalAcciones>
              <button type="button" onClick={() => setFacturaModal(null)} disabled={facturando} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button type="submit" form="pago-factura-datos-form" disabled={facturando} aria-busy={facturando || undefined} className={botonModal('primary')}>
                {facturando && <IconLoader size={16} className="animate-spin" />}
                {facturando ? 'Emitiendo…' : 'Emitir factura'}
              </button>
            </ModalAcciones>
          }
        >
          {facturaModal && (
            <PagoFacturaDatosForm
              faltantes={facturaModal.faltantes}
              datos={facturaModal.datos}
              onChange={(d) => setFacturaModal({ ...facturaModal, datos: d })}
              onSubmit={() => {
                if (!facturando) void handleSubmitFacturaModal()
              }}
              loading={facturando}
            />
          )}
        </Modal>

        {/* Modal de confirmacion previo a emitir — muestra los datos y permite ajustar */}
        <Modal
          isOpen={!!confirmModal}
          onClose={() => !facturando && setConfirmModal(null)}
          title="Confirme los datos de su factura"
          description="La factura electrónica no se puede modificar después de emitirla. Revise que los datos sean correctos."
          size="md"
          footer={
            <ModalAcciones>
              <button type="button" onClick={() => setConfirmModal(null)} disabled={facturando} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button type="button" onClick={handleAjustarDesdeConfirm} disabled={facturando} className={botonModal('secondary')}>
                Corregir datos
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!facturando) void handleConfirmEmitir()
                }}
                disabled={facturando}
                aria-busy={facturando || undefined}
                className={botonModal('primary')}
              >
                {facturando && <IconLoader size={16} className="animate-spin" />}
                {facturando ? 'Emitiendo…' : 'Confirmar y emitir'}
              </button>
            </ModalAcciones>
          }
        >
          {confirmModal && <ConfirmFacturaModal datos={confirmModal.datos} monto={confirmModal.monto} />}
        </Modal>
      </>
    )
  }

  // Opción B: la agencia paga la evaluación. Su checkout no es del prospecto
  // (el API ni siquiera le manda el enlace).
  if (estado.paga === 'gestor' && ['pendiente', 'procesando', 'fallido'].includes(estado.estado)) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-semibold text-blue-900 mb-0.5">Quien gestiona su estudio está pagando la evaluación</p>
        <p className="text-sm text-blue-800">No tiene que pagar nada. Le avisaremos cuando la evaluación avance.</p>
      </div>
    )
  }

  // Procesando (PSE/efectivo): el pago está en manos del medio de pago — no
  // ofrecer "Pagar ahora" de nuevo ni decir que falta definir la forma de pago.
  if (estado.estado === 'procesando') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <IconLoader size={20} className="text-blue-700 shrink-0 animate-spin mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Su pago está en proceso</p>
            <p className="text-sm text-blue-800">
              El medio de pago está procesando su transacción (PSE/efectivo puede tardar desde minutos hasta horas).
              Le avisaremos cuando se confirme — no necesita volver a pagar.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Pendiente con link de Mercado Pago → CTA grande "Pagar ahora".
  if (estado.estado === 'pendiente' && linkPago) {
    return (
      <div className="border-2 border-primary-200 bg-primary-50/40 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <IconCreditCard size={24} className="text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Pague su evaluación crediticia</h3>
            <p className="text-sm text-gray-600 mb-1">
              Monto a pagar: <span className="text-lg font-bold text-gray-900">{montoProspecto(estado)}</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Ya firmó su autorización. Será redirigido a la pasarela de pago segura y, al confirmarse el pago,
              ejecutamos la consulta en centrales de riesgo.
            </p>
            <a
              href={linkPago}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors shadow-sm"
            >
              Pagar ahora
              <IconArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Pendiente sin link todavía (propietario habilitó pero aún no hay checkout).
  if (estado.estado === 'pendiente') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm font-medium text-amber-800">Preparando su enlace de pago</p>
        <p className="text-xs text-amber-600 mt-1">
          El enlace llegará a su correo en unos momentos. También aparecerá aquí en su panel.
        </p>
      </div>
    )
  }

  // Pago fallido → ofrecer reintentar con el mismo link (si sigue válido).
  if (estado.estado === 'fallido') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-800 mb-1">No pudimos procesar su pago</p>
        <p className="text-xs text-red-600 mb-3">
          Monto: {montoProspecto(estado)}. Puede intentarlo de nuevo.
        </p>
        {linkPago && (
          <a
            href={linkPago}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar pago
          </a>
        )}
      </div>
    )
  }

  // P1: la evaluación se devolvió. Sin motivo del API, el texto no lo supone.
  if (estado.estado === 'reembolsado') {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-800">La evaluación se devolvió</p>
        <p className="text-xs text-gray-500 mt-1">Esta evaluación se devolvió a quien la pagó.</p>
      </div>
    )
  }

  // Cancelado o sin definir → mensaje neutro.
  if (estado.estado === 'cancelado') {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-800">El pago fue cancelado</p>
        <p className="text-xs text-gray-500 mt-1">
          Comuníquese con el propietario o con la inmobiliaria para retomar el proceso.
        </p>
      </div>
    )
  }

  // §6.3: ya se definió que paga él, pero primero tiene que autorizar. NO se le
  // muestra ningún CTA de pago: cobrar antes de autorizar es justo lo que el
  // requisito prohíbe (y todavía no existe fila de pago que cobrar).
  if (estado.estado === 'esperando_autorizacion') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-800">Firme primero su autorización</p>
        <p className="text-xs text-blue-600 mt-1">
          Le enviamos por correo y WhatsApp el enlace para autorizar la consulta en centrales de riesgo.
          Apenas lo firme le llega el enlace de pago por {montoProspecto(estado)}.
        </p>
      </div>
    )
  }

  // sin_definir — esperando que admin/inmobiliaria configure el cobro.
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-medium text-blue-800">Esperando que definan la forma de pago</p>
      <p className="text-xs text-blue-600 mt-1">
        Su estudio ya fue habilitado. Quien tramita su arriendo está definiendo cómo se paga el estudio; le
        avisaremos qué sigue.
      </p>
    </div>
  )
}

// ============================================
// Form de datos fiscales (faltantes) — usado por el solicitante al
// facturar su pago de estudio.
// ============================================

const PAGO_FACTURA_LABEL: Record<string, string> = {
  numero_documento: 'Número de documento',
  tipo_documento: 'Tipo de documento',
  nombre_completo: 'Nombre completo',
  direccion: 'Dirección',
  email: 'Correo',
  telefono: 'Teléfono',
  municipio_codigo: 'Municipio',
}

interface PagoFacturaDatosFormProps {
  faltantes: string[]
  datos: IDatosFiscalesPagoFactura
  onChange: (d: IDatosFiscalesPagoFactura) => void
  onSubmit: () => void
  loading: boolean
}

/** Cuerpo del modal de datos fiscales; el botón «Emitir factura» vive en el pie del modal (form="pago-factura-datos-form"). */
function PagoFacturaDatosForm({ faltantes, datos, onChange, onSubmit, loading }: PagoFacturaDatosFormProps) {
  const set = (key: keyof IDatosFiscalesPagoFactura, value: string) => {
    onChange({ ...datos, [key]: value })
  }
  const accessToken = useAuthStore((s) => s.accessToken)
  // Solo se guarda el código DANE; el nombre es para que el campo lo muestre.
  const [municipioNombre, setMunicipioNombre] = useState('')

  return (
    <form
      id="pago-factura-datos-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-4"
    >
      <p className="text-sm text-gray-600">No se guardan en su perfil.</p>

      {faltantes.includes('numero_documento') && (
        <div>
          <label htmlFor="pago-datos-numero_documento" className="block text-sm font-medium text-gray-700 mb-1">
            {PAGO_FACTURA_LABEL.numero_documento} <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input id="pago-datos-numero_documento"
            type="text"
            value={datos.numero_documento || ''}
            onChange={(e) => set('numero_documento', e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
            placeholder="1234567890"
          />
        </div>
      )}

      {faltantes.includes('direccion') && (
        <div>
          <label htmlFor="pago-datos-direccion" className="block text-sm font-medium text-gray-700 mb-1">
            {PAGO_FACTURA_LABEL.direccion} <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input id="pago-datos-direccion"
            type="text"
            value={datos.direccion || ''}
            onChange={(e) => set('direccion', e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
            placeholder="Calle 100 # 20-30"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {faltantes.includes('email') && (
          <div>
            <label htmlFor="pago-datos-email" className="block text-sm font-medium text-gray-700 mb-1">
              {PAGO_FACTURA_LABEL.email} <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input id="pago-datos-email"
              type="email"
              value={datos.email || ''}
              onChange={(e) => set('email', e.target.value)}
              disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
              placeholder="nombre@correo.com"
              autoComplete="email"
            />
          </div>
        )}

        {faltantes.includes('telefono') && (
          <div>
            <label htmlFor="pago-datos-telefono" className="block text-sm font-medium text-gray-700 mb-1">
              {PAGO_FACTURA_LABEL.telefono} <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input id="pago-datos-telefono"
              type="tel"
              value={datos.telefono || ''}
              onChange={(e) => set('telefono', e.target.value)}
              disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
              placeholder="3001234567"
            />
          </div>
        )}
      </div>

      {/* El buscador de municipios en vez de pedir el "código DANE": el
          arrendatario escribe "Medellín" y el código lo pone el catálogo. */}
      {faltantes.includes('municipio_codigo') && (
        <MunicipioCombobox
          value={datos.municipio_codigo ? { codigo: datos.municipio_codigo, nombre: municipioNombre } : null}
          onChange={(v) => {
            set('municipio_codigo', v?.codigo ?? '')
            setMunicipioNombre(v?.nombre ?? '')
          }}
          authToken={accessToken ?? undefined}
        />
      )}

    </form>
  )
}

// ============================================
// Modal de confirmacion previo a emitir factura
// ============================================

const TIPO_DOC_LABEL: Record<string, string> = {
  cc: 'Cédula de Ciudadanía',
  ce: 'Cédula de Extranjería',
  ppt: 'Permiso por Protección Temporal (PPT)',
  pep: 'Permiso Especial de Permanencia (PEP)',
  ti: 'Tarjeta de Identidad',
  nit: 'NIT',
  pasaporte: 'Pasaporte',
}

/** Cuerpo del modal de confirmación; las acciones viven en el pie del modal. */
function ConfirmFacturaModal({
  datos,
  monto,
}: {
  datos: {
    nombre_completo: string
    tipo_documento: string
    numero_documento: string
    email: string
    telefono: string
    direccion: string
    municipio_codigo: string
    municipio_nombre: string
  }
  monto: number
}) {
  const tipoDocLabel = TIPO_DOC_LABEL[datos.tipo_documento?.toLowerCase()] || datos.tipo_documento || '—'
  const formattedMonto = monto > 0
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monto)
    : ''

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Se emitirá con los datos de su registro. Si algo no está bien, use «Corregir datos».
      </p>

      {formattedMonto && (
        <div className="rounded-lg border border-gray-200 px-3 py-2">
          <p className="text-sm text-gray-600">Monto a facturar</p>
          <p className="text-lg font-semibold tabular-nums text-gray-900">{formattedMonto}</p>
        </div>
      )}

      <dl className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
        <DataRow label="Nombre" value={datos.nombre_completo || '—'} />
        <DataRow label="Tipo de documento" value={tipoDocLabel} />
        <DataRow label="Número de documento" value={datos.numero_documento || '—'} />
        <DataRow label="Correo" value={datos.email || '—'} />
        <DataRow label="Teléfono" value={datos.telefono || '—'} />
        <DataRow label="Dirección" value={datos.direccion || '—'} />
        <DataRow
          label="Municipio"
          value={
            datos.municipio_nombre
              ? `${datos.municipio_nombre}${datos.municipio_codigo ? ` (${datos.municipio_codigo})` : ''}`
              : datos.municipio_codigo || '—'
          }
        />
      </dl>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 px-3 py-2 text-sm">
      <dt className="text-gray-600 shrink-0">{label}</dt>
      <dd className="min-w-0 text-gray-900 font-medium text-right break-words">{value}</dd>
    </div>
  )
}
