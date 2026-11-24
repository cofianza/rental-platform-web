/**
 * Integración nuby → Cofianza (solo lectura): panel completo, el mismo para el
 * titular de la inmobiliaria (Configuración → Integraciones) y para el
 * administrador de plataforma sobre una organización.
 *
 * Según lo que diga la API pinta: función apagada, formulario para conectar,
 * o la conexión con su estado, sus pendientes y sus acciones.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useIntegracionNuby } from '@/hooks/useIntegracionNuby'
import { CODIGO_SOLO_TITULAR, CODIGO_YA_SINCRONIZANDO } from '@/lib/integracionNuby'
import type { CandidatoCodigoNuby, CredencialesNuby, ModoIntegracionNuby } from '@/types/integracionNuby'
import { NubyCargando, NubyErrorCarga, NubyNoDisponible, NubySoloTitular, ReglasNuby } from './AvisosNuby'
import { FormularioConexionNuby } from './FormularioConexionNuby'
import { PendientesNubyListas } from './PendientesNubyListas'
import { TarjetaEstadoNuby } from './TarjetaEstadoNuby'

interface Props {
  modo: ModoIntegracionNuby
}

/** Un panel por organización: al cambiar de organización se monta de nuevo y no queda nada de la anterior. */
export function PanelIntegracionNuby({ modo }: Props) {
  return <Panel key={modo.tipo === 'admin' ? `admin:${modo.orgId}` : 'titular'} modo={modo} />
}

function Panel({ modo }: Props) {
  const nuby = useIntegracionNuby(modo)
  const esAdmin = modo.tipo === 'admin'
  // «Cambiar credenciales»: reabre el formulario sobre una conexión ya hecha.
  const [cambiando, setCambiando] = useState(false)
  const [confirmarDesconexion, setConfirmarDesconexion] = useState(false)

  const { estado, error, sincronizando } = nuby
  const integracion = estado?.habilitada && estado.conectada ? estado.integracion : null

  // Cuando termina una copia que esta pantalla venía siguiendo, se avisa: el
  // cambio en la tarjeta (fecha y cifras) pasa fácil inadvertido.
  const copiaSeguida = useRef(false)
  const conectada = !!integracion
  const ultimoError = integracion?.ultimo_error ?? null
  useEffect(() => {
    const termino = copiaSeguida.current && !sincronizando
    copiaSeguida.current = sincronizando
    if (!termino || !conectada) return
    if (ultimoError) toast.error(ultimoError)
    else toast.success('La copia desde nuby terminó.')
  }, [sincronizando, conectada, ultimoError])

  if (!estado) {
    if (nuby.cargando) return <NubyCargando />
    if (error?.code === CODIGO_SOLO_TITULAR) return <NubySoloTitular />
    // La web puede publicarse antes que la API: sin el endpoint, la función aún no existe.
    if (error?.statusCode === 404) return <NubyNoDisponible />
    return (
      <NubyErrorCarga
        mensaje={error?.mensaje ?? 'No pudimos cargar la conexión con nuby.'}
        onReintentar={() => void nuby.recargar()}
      />
    )
  }

  if (!estado.habilitada) return <NubyNoDisponible />

  const conectar = async (credenciales: CredencialesNuby) => {
    const r = await nuby.conectar(credenciales)
    if (r.ok) {
      // Sin copia automática, conectar no trae nada todavía: se dice qué sigue.
      toast.success(
        cambiando
          ? 'Los datos de acceso a nuby quedaron actualizados.'
          : estado.sincronizacion_automatica
            ? 'nuby quedó conectado.'
            : 'nuby quedó conectado. Pulse «Copiar ahora» para traer los inmuebles.',
      )
      setCambiando(false)
    }
    return r
  }

  const sincronizar = async () => {
    const r = await nuby.sincronizar()
    if (r.ok) toast.success('Empezó la copia. El resultado aparecerá aquí cuando termine.')
    else if (r.code === CODIGO_YA_SINCRONIZANDO) toast.info(r.mensaje)
    else toast.error(r.mensaje)
  }

  const probar = async () => {
    const r = await nuby.probar()
    if (r.ok) toast.success('La conexión con nuby funciona.')
    else toast.error(r.mensaje)
  }

  const desconectar = async () => {
    const r = await nuby.desconectar()
    if (r.ok) {
      setCambiando(false)
      toast.success('nuby quedó desconectado. Los inmuebles siguen en Cofianza.')
    } else {
      toast.error(r.mensaje)
    }
  }

  // Con la conexión en pantalla, un fallo al actualizar no la reemplaza: se avisa.
  const actualizar = async () => {
    if (!(await nuby.recargar())) toast.error('No pudimos actualizar el estado. Intente de nuevo.')
  }

  const vincular = async (codigo: string, candidato: CandidatoCodigoNuby) => {
    const r = await nuby.vincular({ codigo, inmueble_id: candidato.inmueble_id })
    if (r.ok) toast.success(`El código ${codigo} quedó vinculado.`)
    else toast.error(r.mensaje)
  }

  return (
    <div className="space-y-6">
      {integracion && !cambiando ? (
        <>
          <TarjetaEstadoNuby
            integracion={integracion}
            totales={estado.totales}
            sincronizacionAutomatica={estado.sincronizacion_automatica}
            accion={nuby.accion}
            sincronizando={sincronizando}
            sondeoAgotado={nuby.sondeoAgotado}
            actualizando={nuby.cargando}
            onSincronizar={() => void sincronizar()}
            onProbar={() => void probar()}
            onCambiar={() => setCambiando(true)}
            onDesconectar={() => setConfirmarDesconexion(true)}
            onActualizar={() => void actualizar()}
          />
          <PendientesNubyListas
            pendientes={estado.pendientes}
            totales={estado.totales}
            ocupado={nuby.accion !== null || sincronizando}
            onVincular={vincular}
          />
        </>
      ) : (
        <FormularioConexionNuby
          esAdmin={esAdmin}
          instanciaActual={integracion?.instancia}
          enviando={nuby.accion === 'conectar'}
          onConectar={conectar}
          onCancelar={integracion ? () => setCambiando(false) : undefined}
        />
      )}

      <ReglasNuby sincronizacionAutomatica={estado.sincronizacion_automatica} />

      <ConfirmDialog
        isOpen={confirmarDesconexion}
        onClose={() => setConfirmarDesconexion(false)}
        onConfirm={desconectar}
        title="Desconectar nuby"
        message={
          <div className="space-y-2">
            <p>Cofianza dejará de copiar los inmuebles desde nuby.</p>
            <p>Los que ya están en Cofianza se quedan y, desde ese momento, se editan aquí.</p>
            <p>Para volver a conectar habrá que registrar las credenciales de nuevo.</p>
          </div>
        }
        confirmLabel="Desconectar"
        variant="danger"
      />
    </div>
  )
}
