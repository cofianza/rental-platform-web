'use client'

/**
 * Adenda 6 §4: las listas restrictivas de esta persona (solicitante o segundo firmante) no llegaron de Auco. Mientras
 * no estén verificadas, el contrato no se puede generar. El analista las verifica directamente en Auco y registra la
 * fecha de la consulta, el resultado y la evidencia; con eso el estudio sigue solo. Con el registro hecho, la
 * tarjeta muestra la constancia y el enlace a la evidencia. Solo administrador y operador analista: la API manda
 * `verificacion_listas` solo a ellos.
 */

import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconAlertTriangle, IconExternalLink, IconLoader, IconPaperclip, IconShieldCheck } from '@/components/icons'
import { formatDate, formatDateTime } from '@/lib/constants'
import { useVerificacionListas } from '@/hooks/useVerificacionListas'
import type { IVerificacionListas, ResultadoVerificacionListas } from '@/types/estudio'

const MAX_BYTES = 10 * 1024 * 1024
const TIPOS = 'application/pdf,image/jpeg,image/png,image/webp'

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

const BOTON =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'

export function VerificacionListas({
  estudioId,
  verificacion,
  onHecho,
}: {
  estudioId: string
  verificacion: IVerificacionListas
  /** Recarga el detalle (con o sin éxito). */
  onHecho: () => Promise<unknown> | void
}) {
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(hoyBogota)
  const [resultado, setResultado] = useState<ResultadoVerificacionListas | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [nota, setNota] = useState('')
  const [otrosHallazgos, setOtrosHallazgos] = useState(false)
  const tituloId = useId()
  const fechaId = useId()
  const archivoId = useId()
  const ayudaArchivoId = useId()
  const notaId = useId()
  const { registrar, enviando, ultimoError } = useVerificacionListas(estudioId, onHecho)

  const archivoGrande = !!archivo && archivo.size > MAX_BYTES
  const minima = verificacion.fecha_minima ?? undefined
  const fechaMal = !fecha || fecha > hoyBogota() || (!!minima && fecha < minima)
  const listo = !fechaMal && !!resultado && !!archivo && !archivoGrande
  // Lo que falta para registrar (el botón se apaga sin decir por qué, si no).
  const falta = [
    fechaMal && (minima ? `una fecha entre el ${minima.split('-').reverse().join('/')} y hoy` : 'una fecha que no sea futura'),
    !resultado && 'el resultado',
    (!archivo || archivoGrande) && 'la evidencia (hasta 10 MB)',
  ].filter((x): x is string => !!x)

  const limpiar = () => {
    setResultado(null)
    setArchivo(null)
    setNota('')
    setOtrosHallazgos(false)
    setFecha(hoyBogota())
  }

  // Cerrar no borra lo escrito: si el registro falló, al abrir de nuevo sigue ahí.
  const cerrar = () => setAbierto(false)

  const confirmar = async () => {
    if (!listo || !resultado || !archivo) return
    const ok = await registrar({ fecha_consulta: fecha, resultado, nota, otros_hallazgos: otrosHallazgos, evidencia: archivo })
    if (ok) limpiar()
    setAbierto(false)
  }

  const r = verificacion.registrada
  if (r) {
    return (
      <section aria-labelledby={tituloId} className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 id={tituloId} className="flex items-start gap-2 text-sm font-semibold text-gray-900">
          <IconShieldCheck size={16} className="mt-0.5 shrink-0 text-primary-700" />
          Listas restrictivas verificadas en Auco por Cofianza
        </h3>
        <p className="text-sm text-gray-700">
          Consulta del {formatDate(`${r.fecha_consulta}T12:00:00-05:00`)}:{' '}
          <span className="font-medium">{r.resultado === 'sin_coincidencias' ? 'sin coincidencias' : 'con coincidencias'}</span>. Registrada
          el {formatDateTime(r.en)}
        </p>
        {r.nota && <p className="text-sm text-gray-700">Nota: {r.nota}</p>}
        {r.evidencia_url ? (
          <a
            href={r.evidencia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800"
          >
            <IconPaperclip size={16} aria-hidden="true" />
            <span className="break-all">{r.evidencia_nombre}</span>
            <IconExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        ) : (
          <p className="text-sm text-gray-500">Evidencia: {r.evidencia_nombre} (no se pudo abrir el enlace; recargue el detalle).</p>
        )}
        {r.evidencia_url && <p className="text-xs text-gray-500">El enlace vence a los 5 minutos; si no abre, recargue el detalle.</p>}
      </section>
    )
  }

  if (!verificacion.pendiente) return null

  // No se puede registrar aquí (la persona salió, el estudio se canceló…): solo el motivo, sin pedir nada.
  if (!verificacion.puede_registrar) {
    return (
      <section aria-labelledby={tituloId} className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 id={tituloId} className="text-sm font-semibold text-gray-900">
          Listas restrictivas sin verificar
        </h3>
        {verificacion.motivo && <p className="text-sm text-gray-700">{verificacion.motivo}</p>}
      </section>
    )
  }

  return (
    <section aria-labelledby={tituloId} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 id={tituloId} className="flex items-start gap-2 text-sm font-semibold text-amber-900">
        <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
        Listas restrictivas sin verificar
      </h3>
      <p className="text-sm text-amber-800">
        Auco no entregó las listas restrictivas de esta persona. Mientras no estén verificadas, el contrato no se puede generar ni
        enviar a firma. Verifíquelas directamente en Auco y registre la consulta: si el estudio solo esperaba esto, sigue solo; si
        queda en revisión, apruébelo.
      </p>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={enviando}
        className={`${BOTON} border-amber-700 bg-amber-700 text-white hover:bg-amber-800`}
      >
        {enviando ? <IconLoader size={16} className="animate-spin" /> : <IconShieldCheck size={16} />}
        Registrar verificación de listas
      </button>
      {ultimoError && (
        <p role="alert" className="text-sm text-red-700">
          {ultimoError}
        </p>
      )}
      <ConfirmDialog
        isOpen={abierto}
        onClose={cerrar}
        onConfirm={confirmar}
        title="Registrar la verificación hecha en Auco"
        confirmLabel="Registrar verificación"
        isLoading={enviando}
        confirmDisabled={!listo}
        message={
          <div className="space-y-3 text-left">
            <p>Registre la consulta que hizo en Auco. Queda en el estudio con la evidencia; la inmobiliaria no la ve.</p>
            <div className="space-y-1">
              <label htmlFor={fechaId} className="block text-xs font-medium text-gray-700">
                Fecha de la consulta en Auco
              </label>
              <input
                id={fechaId}
                type="date"
                value={fecha}
                min={minima}
                max={hoyBogota()}
                onChange={(e) => setFecha(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium text-gray-700">Resultado</legend>
              {(
                [
                  ['sin_coincidencias', 'Sin coincidencias'],
                  ['con_coincidencias', 'Con coincidencias'],
                ] as const
              ).map(([valor, texto]) => (
                <label key={valor} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-gray-800">
                  <input type="radio" name={`resultado-${estudioId}`} value={valor} checked={resultado === valor} onChange={() => setResultado(valor)} />
                  {texto}
                </label>
              ))}
              {resultado === 'con_coincidencias' && (
                <p className="text-sm font-medium text-red-700">
                  Con coincidencias, la coincidencia queda confirmada en este mismo paso: con dos personas, la operación queda bloqueada
                  por listas; con una sola, el estudio queda no aprobado.
                </p>
              )}
            </fieldset>
            <label className="flex min-h-10 cursor-pointer items-start gap-2 text-sm text-gray-800">
              <input type="checkbox" className="mt-1" checked={otrosHallazgos} onChange={(e) => setOtrosHallazgos(e.target.checked)} />
              <span>
                El reporte de Auco trae otros hallazgos (Registraduría, Policía, Procuraduría, personas expuestas políticamente…). Con
                ellos el estudio queda en revisión.
              </span>
            </label>
            <div className="space-y-1">
              <label htmlFor={archivoId} className="block text-xs font-medium text-gray-700">
                Evidencia de la consulta (PDF o imagen)
              </label>
              <input
                id={archivoId}
                type="file"
                accept={TIPOS}
                aria-describedby={ayudaArchivoId}
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-700 file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:text-sm file:font-medium"
              />
              <p id={ayudaArchivoId} className={`text-xs ${archivoGrande ? 'text-red-700' : 'text-gray-500'}`}>
                {archivoGrande ? 'El archivo pasa de 10 MB.' : 'Hasta 10 MB.'}
              </p>
            </div>
            <div className="space-y-1">
              <label htmlFor={notaId} className="block text-xs font-medium text-gray-700">
                Nota (opcional)
              </label>
              <textarea
                id={notaId}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={1000}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {falta.length > 0 && <p className="text-xs text-gray-600">Para registrar, falta: {falta.join(', ')}.</p>}
          </div>
        }
      />
    </section>
  )
}
