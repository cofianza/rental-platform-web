/**
 * Formulario de un aviso de servicio (crear o editar), con vista previa de
 * cómo lo verán. Al elegir el servicio propone un texto en usted que se puede
 * cambiar; si ya se escribió algo a mano, no se pisa.
 */

'use client'

import { useId, useState } from 'react'
import { IconLoader, IconRefresh } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import {
  AUDIENCIAS_AVISO,
  LIMITE_MENSAJE,
  LIMITE_TITULO,
  NIVELES_AVISO,
  SERVICIOS_AVISO,
  bogotaLocalAIso,
  isoABogotaLocal,
  plantillaDe,
  tieneCamposPorLlenar,
} from '@/lib/avisosServicio'
import { cn } from '@/lib/utils'
import type { AudienciaAviso, IAvisoServicio, IAvisoServicioInput, NivelAviso, ServicioAviso } from '@/types/avisosServicio'
import { AvisoServicioCard } from './AvisoServicioCard'

const CAMPO =
  'w-full rounded-lg border px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500'

type Errores = Partial<Record<'titulo' | 'mensaje' | 'audiencia' | 'hasta', string>>

interface Props {
  /** null = aviso nuevo. */
  aviso: IAvisoServicio | null
  /** Servicio con el que abre un aviso nuevo (los atajos de la pantalla). */
  servicioInicial?: ServicioAviso
  onClose: () => void
  onGuardar: (input: IAvisoServicioInput) => Promise<boolean>
}

export function AvisoServicioForm({ aviso, servicioInicial = 'otro', onClose, onGuardar }: Props) {
  const ids = useId()
  const inicial = aviso ?? null
  const sugerida = plantillaDe(servicioInicial)
  const [servicio, setServicio] = useState<ServicioAviso>(inicial?.servicio ?? servicioInicial)
  const [nivel, setNivel] = useState<NivelAviso>(inicial?.nivel ?? sugerida.nivel)
  const [titulo, setTitulo] = useState(inicial?.titulo ?? sugerida.titulo)
  const [mensaje, setMensaje] = useState(inicial?.mensaje ?? sugerida.mensaje)
  const [audiencia, setAudiencia] = useState<AudienciaAviso[]>(
    inicial?.audiencia ?? AUDIENCIAS_AVISO.map((a) => a.value),
  )
  const [conHora, setConHora] = useState(!!inicial?.hasta)
  const [hasta, setHasta] = useState(inicial?.hasta ? isoABogotaLocal(inicial.hasta) : '')
  // Al editar, el texto ya es «propio»: cambiar el servicio no lo reemplaza.
  const [aMano, setAMano] = useState(!!inicial)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)

  function usarSugerido(s: ServicioAviso) {
    const p = plantillaDe(s)
    setTitulo(p.titulo)
    setMensaje(p.mensaje)
    setNivel(p.nivel)
    setAMano(false)
    setErrores({})
  }

  function cambiarServicio(s: ServicioAviso) {
    setServicio(s)
    if (!aMano) usarSugerido(s)
  }

  function alternarAudiencia(a: AudienciaAviso, marcado: boolean) {
    setAudiencia((prev) => (marcado ? [...prev, a] : prev.filter((x) => x !== a)))
    setErrores((e) => ({ ...e, audiencia: undefined }))
  }

  async function guardar() {
    const nuevos: Errores = {}
    const t = titulo.trim()
    const m = mensaje.trim()
    if (t.length < 3) nuevos.titulo = 'Escriba un título de al menos 3 caracteres.'
    if (m.length < 10) nuevos.mensaje = 'Escriba un mensaje de al menos 10 caracteres.'
    else if (tieneCamposPorLlenar(m)) nuevos.mensaje = 'Complete o borre lo que está entre [corchetes].'
    if (tieneCamposPorLlenar(t)) nuevos.titulo = 'Complete o borre lo que está entre [corchetes].'
    if (audiencia.length === 0) nuevos.audiencia = 'Elija al menos a quién mostrarle el aviso.'
    let hastaIso: string | null = null
    if (conHora) {
      hastaIso = bogotaLocalAIso(hasta)
      if (!hastaIso) nuevos.hasta = 'Elija la fecha y la hora.'
      else if (Date.parse(hastaIso) <= Date.now()) nuevos.hasta = 'Esa hora ya pasó. Elija una hora futura.'
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) {
      // En el celular el error puede quedar fuera de la vista: se lleva el foco al primero.
      const primero = (['titulo', 'mensaje', 'audiencia', 'hasta'] as const).find((k) => nuevos[k])
      requestAnimationFrame(() => document.getElementById(`${ids}-${primero}`)?.focus())
      return
    }

    setGuardando(true)
    const ok = await onGuardar({
      servicio,
      nivel,
      titulo: t,
      mensaje: m,
      audiencia,
      // Editar no cambia si está publicado; crear lo publica de una vez.
      activo: inicial ? inicial.activo : true,
      hasta: hastaIso,
    })
    setGuardando(false)
    if (ok) onClose()
  }

  const contador = (n: number, max: number, id: string) => (
    <span id={id} className={cn('text-xs', n > max ? 'text-red-600' : 'text-gray-500')}>
      {n} de {max} caracteres
    </span>
  )

  return (
    <Modal
      isOpen
      onClose={guardando ? () => {} : onClose}
      title={inicial ? 'Editar aviso' : 'Publicar un aviso'}
      description={
        inicial
          ? 'Los cambios se ven en el banner en pocos minutos (de una vez a quien abra o recargue la plataforma), también a quien ya lo había ocultado.'
          : 'Sale como banner arriba del panel de quienes elija en pocos minutos (de una vez a quien abra o recargue la plataforma), hasta que lo marque como resuelto.'
      }
      size="lg"
      footer={
        <ModalAcciones>
          <button type="button" onClick={onClose} disabled={guardando} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            aria-busy={guardando || undefined}
            className={botonModal('primary')}
          >
            {guardando && <IconLoader size={16} className="animate-spin" />}
            {inicial ? 'Guardar cambios' : 'Publicar aviso'}
          </button>
        </ModalAcciones>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-servicio`} className="mb-1 block text-sm font-medium text-gray-700">
              ¿Qué está fallando?
            </label>
            <select
              id={`${ids}-servicio`}
              value={servicio}
              onChange={(e) => cambiarServicio(e.target.value as ServicioAviso)}
              className={cn(CAMPO, 'border-gray-300 bg-white')}
              disabled={guardando}
            >
              {SERVICIOS_AVISO.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {aMano && plantillaDe(servicio).titulo && (
              <button
                type="button"
                onClick={() => usarSugerido(servicio)}
                className="mt-1.5 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
              >
                <IconRefresh size={12} />
                Usar el texto sugerido ({plantillaDe(servicio).label})
              </button>
            )}
          </div>

          <fieldset>
            <legend className="mb-1 block text-sm font-medium text-gray-700">¿Qué tan grave es?</legend>
            <div className="space-y-1.5">
              {NIVELES_AVISO.map((n) => (
                <label key={n.value} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name={`${ids}-nivel`}
                    value={n.value}
                    checked={nivel === n.value}
                    onChange={() => setNivel(n.value)}
                    disabled={guardando}
                    className="mt-0.5 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    <span className="font-medium text-gray-900">{n.label}</span>
                    <span className="block text-xs text-gray-500">{n.ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <label htmlFor={`${ids}-titulo`} className="text-sm font-medium text-gray-700">
              Título
            </label>
            {contador(titulo.length, LIMITE_TITULO, `${ids}-titulo-contador`)}
          </div>
          <input
            id={`${ids}-titulo`}
            type="text"
            value={titulo}
            maxLength={LIMITE_TITULO}
            onChange={(e) => {
              setTitulo(e.target.value)
              setAMano(true)
              setErrores((x) => ({ ...x, titulo: undefined }))
            }}
            aria-invalid={!!errores.titulo}
            aria-describedby={errores.titulo ? `${ids}-titulo-error ${ids}-titulo-contador` : `${ids}-titulo-contador`}
            className={cn(CAMPO, errores.titulo ? 'border-red-400' : 'border-gray-300')}
            disabled={guardando}
          />
          {errores.titulo && (
            <p id={`${ids}-titulo-error`} className="mt-1 text-xs text-red-600">
              {errores.titulo}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <label htmlFor={`${ids}-mensaje`} className="text-sm font-medium text-gray-700">
              Mensaje: qué pasa y qué hacer mientras tanto
            </label>
            {contador(mensaje.length, LIMITE_MENSAJE, `${ids}-mensaje-contador`)}
          </div>
          <textarea
            id={`${ids}-mensaje`}
            rows={4}
            value={mensaje}
            maxLength={LIMITE_MENSAJE}
            onChange={(e) => {
              setMensaje(e.target.value)
              setAMano(true)
              setErrores((x) => ({ ...x, mensaje: undefined }))
            }}
            aria-invalid={!!errores.mensaje}
            aria-describedby={errores.mensaje ? `${ids}-mensaje-error ${ids}-mensaje-contador` : `${ids}-mensaje-contador`}
            className={cn(CAMPO, 'resize-y', errores.mensaje ? 'border-red-400' : 'border-gray-300')}
            disabled={guardando}
          />
          {errores.mensaje && (
            <p id={`${ids}-mensaje-error`} className="mt-1 text-xs text-red-600">
              {errores.mensaje}
            </p>
          )}
        </div>

        <fieldset aria-describedby={errores.audiencia ? `${ids}-audiencia-error` : undefined}>
          <legend className="mb-1 block text-sm font-medium text-gray-700">¿A quién se le muestra?</legend>
          <p className="mb-2 text-xs text-gray-500">El equipo de Cofianza lo ve siempre.</p>
          <div className="space-y-1.5">
            {AUDIENCIAS_AVISO.map((a, i) => (
              <label key={a.value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  id={i === 0 ? `${ids}-audiencia` : undefined}
                  type="checkbox"
                  checked={audiencia.includes(a.value)}
                  onChange={(e) => alternarAudiencia(a.value, e.target.checked)}
                  disabled={guardando}
                  className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="font-medium text-gray-900">{a.label}</span>
                  <span className="block text-xs text-gray-500">{a.ayuda}</span>
                </span>
              </label>
            ))}
          </div>
          {errores.audiencia && (
            <p id={`${ids}-audiencia-error`} className="mt-1 text-xs text-red-600">
              {errores.audiencia}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-gray-700">¿Hasta cuándo?</legend>
          <div className="space-y-1.5 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`${ids}-duracion`}
                checked={!conHora}
                onChange={() => {
                  setConHora(false)
                  setErrores((x) => ({ ...x, hasta: undefined }))
                }}
                disabled={guardando}
                className="border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Hasta que lo marque como resuelto
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`${ids}-duracion`}
                checked={conHora}
                onChange={() => setConHora(true)}
                disabled={guardando}
                className="border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Que deje de mostrarse automáticamente a una hora (útil para un mantenimiento)
            </label>
          </div>
          {conHora && (
            <div className="mt-2 sm:max-w-xs">
              <label htmlFor={`${ids}-hasta`} className="sr-only">
                Fecha y hora en que deja de mostrarse (hora de Colombia)
              </label>
              <input
                id={`${ids}-hasta`}
                type="datetime-local"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value)
                  setErrores((x) => ({ ...x, hasta: undefined }))
                }}
                aria-invalid={!!errores.hasta}
                aria-describedby={`${ids}-hasta-ayuda`}
                className={cn(CAMPO, errores.hasta ? 'border-red-400' : 'border-gray-300')}
                disabled={guardando}
              />
              <p id={`${ids}-hasta-ayuda`} className={cn('mt-1 text-xs', errores.hasta ? 'text-red-600' : 'text-gray-500')}>
                {errores.hasta ?? 'Hora de Colombia.'}
              </p>
            </div>
          )}
        </fieldset>

        {/* Reporte de la Oficina Virtual (25-nov), punto 12: en el panel el aviso es una línea con el título; el mensaje
            queda tras «Ver más». En las páginas de prospectos se ve completo. Las dos vistas, para escribir el título
            con lo esencial. */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Así lo verán</p>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">En el panel (inmobiliarias, propietarios y el equipo de Cofianza)</p>
            <AvisoServicioCard vistaPrevia compacto servicio={servicio} nivel={nivel} titulo={titulo.trim()} mensaje={mensaje.trim()} />
          </div>
          {audiencia.includes('prospecto') && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">En las páginas de prospectos</p>
              <AvisoServicioCard vistaPrevia servicio={servicio} nivel={nivel} titulo={titulo.trim()} mensaje={mensaje.trim()} />
            </div>
          )}
          <p className="text-xs text-gray-500">
            En el panel se ve en una línea, solo el título, con «Ver más» para el mensaje: ponga lo esencial en el título.
            {audiencia.includes('prospecto') && ' En las páginas de prospectos se ve completo (en el celular, 3 líneas con «Ver más»).'}{' '}
            {nivel === 'caido'
              ? '«Fuera de servicio» no se puede cerrar.'
              : 'Cada persona lo puede cerrar con la X y no le vuelve a salir; si usted lo edita, le vuelve a salir.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}
