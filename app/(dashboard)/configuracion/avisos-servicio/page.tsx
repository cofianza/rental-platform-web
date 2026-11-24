/**
 * Avisos de servicio — solo el administrador.
 * Cuando falla algo de afuera (WhatsApp de Meta, la pasarela de pagos, la
 * firma, las centrales de riesgo…) se publica un aviso y la plataforma lo
 * muestra como banner a quien se elija, con qué hacer mientras tanto. Al
 * marcarlo resuelto deja de verse y queda en el historial.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonDetail } from '@/components/ui/Skeleton'
import { IconCheckCircle, IconEdit, IconHistory, IconLoader, IconPlus, IconRefresh, IconTrash } from '@/components/icons'
import { AvisoServicioCard, ICONO_SERVICIO } from '@/components/avisos/AvisoServicioCard'
import { AvisoServicioForm } from '@/components/avisos/AvisoServicioForm'
import { SERVICIOS_AVISO, etiquetaNivel, plantillaDe, textoAudiencia } from '@/lib/avisosServicio'
import { formatDateTime } from '@/lib/constants'
import {
  actualizarAviso,
  crearAviso,
  eliminarAviso,
  listarAvisos,
} from '@/services/avisosServicioService'
import { useAuthStore } from '@/stores/auth.store'
import { useAvisosServicioStore } from '@/stores/avisosServicio.store'
import type { IAvisoServicio, IAvisoServicioInput, ServicioAviso } from '@/types/avisosServicio'

/** Los atajos: las fallas que más pasan, con el texto ya escrito. */
const ATAJOS: ServicioAviso[] = ['whatsapp', 'correo', 'pagos', 'firma', 'evaluacion', 'mantenimiento']

function vigente(a: IAvisoServicio, ahora: number): boolean {
  return a.activo && (!a.hasta || Date.parse(a.hasta) > ahora)
}

function mensajeDe(err: unknown, porDefecto: string): string {
  return (err as { message?: string })?.message || porDefecto
}

type Formulario = { aviso: IAvisoServicio | null; servicio?: ServicioAviso } | null

export default function AvisosServicioPage() {
  const rol = useAuthStore((s) => s.user?.rol)
  const esAdmin = rol === 'administrador'
  const [avisos, setAvisos] = useState<IAvisoServicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(null)
  const [porEliminar, setPorEliminar] = useState<IAvisoServicio | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  // Se fija al cargar: «vigente» depende de la hora y no debe cambiar a mitad del render.
  const [ahora, setAhora] = useState(() => Date.now())

  const cargar = useCallback(
    () =>
      listarAvisos()
        .then((lista) => {
          setAvisos(lista)
          setAhora(Date.now())
          setErrorCarga(null)
        })
        .catch((err: unknown) => setErrorCarga(mensajeDe(err, 'No se pudieron cargar los avisos.')))
        .finally(() => setCargando(false)),
    [],
  )

  useEffect(() => {
    if (esAdmin) void cargar()
  }, [esAdmin, cargar])

  /** La fila cambió de sección o se borró: el foco va al título de la lista, no al vacío. */
  function enfocarLista() {
    requestAnimationFrame(() => document.getElementById('avisos-publicados')?.focus())
  }

  /** Tras cada cambio: la lista y el banner de esta misma pantalla. */
  async function refrescar() {
    await cargar()
    if (rol) void useAvisosServicioStore.getState().cargar(rol)
  }

  async function guardar(input: IAvisoServicioInput): Promise<boolean> {
    const editando = formulario?.aviso
    try {
      if (editando) {
        await actualizarAviso(editando.id, input)
        toast.success('Aviso actualizado.')
      } else {
        await crearAviso(input)
        toast.success('Aviso publicado. Se verá en pocos minutos; de una vez a quien abra o recargue la plataforma.')
      }
      await refrescar()
      return true
    } catch (err) {
      toast.error(mensajeDe(err, 'No se pudo guardar el aviso.'))
      return false
    }
  }

  async function cambiarActivo(a: IAvisoServicio, activo: boolean) {
    setOcupado(a.id)
    try {
      await actualizarAviso(a.id, { activo })
      toast.success(
        activo ? 'Aviso publicado de nuevo.' : 'Aviso marcado como resuelto: deja de mostrarse en pocos minutos.',
      )
      await refrescar()
      enfocarLista()
    } catch (err) {
      toast.error(mensajeDe(err, 'No se pudo cambiar el aviso.'))
    } finally {
      setOcupado(null)
    }
  }

  async function eliminar() {
    if (!porEliminar) return
    try {
      await eliminarAviso(porEliminar.id)
      toast.success('Aviso eliminado.')
      await refrescar()
      enfocarLista()
    } catch (err) {
      toast.error(mensajeDe(err, 'No se pudo eliminar el aviso.'))
    }
  }

  const publicados = avisos.filter((a) => vigente(a, ahora))
  const historial = avisos.filter((a) => !vigente(a, ahora))

  const botonAccion =
    'inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50'

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Avisos de servicio"
        subtitle="Cuando algo falle (WhatsApp, correos, pagos, firma…), publique un aviso: sale como banner arriba del panel de quienes elija, con qué hacer mientras tanto."
        actions={
          esAdmin ? (
            <button
              type="button"
              onClick={() => setFormulario({ aviso: null })}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800"
            >
              <IconPlus size={16} />
              Nuevo aviso
            </button>
          ) : undefined
        }
      />

      {!esAdmin ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
          Solo el administrador puede publicar avisos de servicio.
        </div>
      ) : cargando ? (
        <SkeletonDetail bloques={2} etiqueta="Cargando los avisos…" />
      ) : errorCarga ? (
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-700">{errorCarga}</p>
          <button
            type="button"
            onClick={() => {
              setCargando(true)
              void cargar()
            }}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            <IconRefresh size={14} />
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Atajos */}
          <section aria-labelledby="avisos-atajos" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 id="avisos-atajos" className="text-sm font-semibold text-gray-900">
              Publicar rápido
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Abre el aviso con un texto sugerido que puede ajustar antes de publicar.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ATAJOS.map((s) => {
                const Icono = ICONO_SERVICIO[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormulario({ aviso: null, servicio: s })}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-800"
                  >
                    <Icono size={14} />
                    {plantillaDe(s).label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Publicados */}
          <section aria-labelledby="avisos-publicados">
            <h2 id="avisos-publicados" tabIndex={-1} className="mb-3 text-base font-semibold text-gray-900 focus:outline-none">
              Publicados ahora {publicados.length > 0 && <span className="text-gray-500">({publicados.length})</span>}
            </h2>
            {publicados.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
                <IconCheckCircle size={20} className="shrink-0 text-primary-600" />
                No hay avisos publicados: nadie ve un banner de fallas en este momento.
              </div>
            ) : (
              <ul className="space-y-4">
                {publicados.map((a) => (
                  <li key={a.id} className="space-y-2">
                    <AvisoServicioCard
                      vistaPrevia
                      servicio={a.servicio}
                      nivel={a.nivel}
                      titulo={a.titulo}
                      mensaje={a.mensaje}
                      pie={
                        <>
                          Lo ven: {textoAudiencia(a.audiencia)} · Publicado: {formatDateTime(a.creado_en)}
                          {a.hasta && <> · Deja de mostrarse: {formatDateTime(a.hasta)}</>}
                        </>
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => cambiarActivo(a, false)}
                        disabled={ocupado === a.id}
                        className={`${botonAccion} border-primary-700 bg-primary-700 text-white hover:bg-primary-800`}
                      >
                        {ocupado === a.id ? <IconLoader size={14} className="animate-spin" /> : <IconCheckCircle size={14} />}
                        Marcar como resuelto
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormulario({ aviso: a })}
                        disabled={ocupado === a.id}
                        className={`${botonAccion} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
                      >
                        <IconEdit size={14} />
                        Editar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Historial */}
          {historial.length > 0 && (
            <section aria-labelledby="avisos-historial">
              <h2 id="avisos-historial" className="mb-3 flex items-center gap-1.5 text-base font-semibold text-gray-900">
                <IconHistory size={18} className="text-gray-500" />
                Historial
              </h2>
              <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
                {historial.map((a) => {
                  const Icono = ICONO_SERVICIO[a.servicio]
                  const cuando = a.activo
                    ? `Dejó de mostrarse el ${formatDateTime(a.hasta!)}`
                    : `Resuelto el ${formatDateTime(a.resuelto_en ?? a.actualizado_en)}`
                  return (
                    <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                      <Icono size={18} className="mt-0.5 hidden shrink-0 text-gray-500 sm:block" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="break-words font-medium text-gray-900">{a.titulo}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {SERVICIOS_AVISO.find((s) => s.value === a.servicio)?.label} · {etiquetaNivel(a.nivel)} · {cuando}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => cambiarActivo(a, true)}
                          disabled={ocupado === a.id}
                          className={`${botonAccion} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
                        >
                          {ocupado === a.id ? <IconLoader size={14} className="animate-spin" /> : <IconRefresh size={14} />}
                          Volver a publicar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPorEliminar(a)}
                          disabled={ocupado === a.id}
                          aria-label={`Eliminar el aviso «${a.titulo}»`}
                          title="Eliminar"
                          className={`${botonAccion} border-gray-300 bg-white text-gray-500 hover:bg-red-50 hover:text-red-700`}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {formulario && (
        <AvisoServicioForm
          aviso={formulario.aviso}
          servicioInicial={formulario.servicio}
          onClose={() => setFormulario(null)}
          onGuardar={guardar}
        />
      )}

      <ConfirmDialog
        isOpen={!!porEliminar}
        onClose={() => setPorEliminar(null)}
        onConfirm={eliminar}
        title="Eliminar aviso"
        message={`«${porEliminar?.titulo ?? ''}» se borra del historial. La bitácora conserva el registro.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  )
}
