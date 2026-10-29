/**
 * Listas restrictivas OFAC y ONU de la migración de cartera (Adenda 1 §6): la
 * copia local con la que se verifica a cada arrendatario al validar un archivo.
 * Con una lista de más de `dias_max` días sin actualizar la API no valida ni
 * procesa. `compacto` va en la carga; el completo, en la página principal.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { IconAlertTriangle, IconRefresh, IconShieldCheck } from '@/components/icons'
import { Chip, SeccionEstado, SeccionHeader, Tabla, Td, fechaCorta, useSeccion } from '@/components/dashboard/secciones/_shared'
import { useAuth } from '@/hooks/useAuth'
import { migracionService } from '@/services/migracionService'
import type { ListaRestrictiva } from '@/types/migracion'

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })

/** La copia más vieja de las tres: la que manda en la vigencia. */
export const masAntigua = (listas: ListaRestrictiva[]) =>
  listas.map((l) => l.sincronizada_en).filter((x): x is string => !!x).sort()[0] ?? null

export function EstadoListas({ compacto = false }: { compacto?: boolean }) {
  const { data, loading, error, reload } = useSeccion(migracionService.estadoListas)
  const esAdmin = useAuth().user?.rol === 'administrador'
  const [actualizando, setActualizando] = useState(false)

  const actualizar = async () => {
    setActualizando(true)
    try {
      const r = await migracionService.actualizarListas()
      const fallas = r.resultados.filter((x) => !x.ok)
      if (fallas.length) {
        const nombre = (c: string) => r.listas.find((l) => l.lista === c)?.nombre ?? c
        toast.error(`No se pudo actualizar: ${fallas.map((f) => `${nombre(f.lista)} (${f.error ?? 'error'})`).join('; ')}. Las demás quedaron al día.`)
      } else toast.success('Listas restrictivas actualizadas.')
    } catch (e) {
      toast.error((e instanceof Error && e.message) || 'No se pudieron actualizar las listas restrictivas.')
    } finally {
      setActualizando(false)
      reload()
    }
  }

  const boton = esAdmin && (
    <Button variante="secondary" tamano="sm" onClick={actualizar} disabled={actualizando}>
      <IconRefresh size={14} /> {actualizando ? 'Actualizando…' : 'Actualizar listas ahora'}
    </Button>
  )

  if (compacto) {
    if (loading || error || !data) return null
    const vencidas = data.listas.filter((l) => !l.vigente)
    if (!vencidas.length)
      return (
        <p className="flex items-center gap-1.5 text-xs text-ink-600">
          <IconShieldCheck size={14} className="shrink-0 text-primary-600" />
          Listas restrictivas OFAC y ONU vigentes (copia del {fechaCorta(masAntigua(data.listas))}).
        </p>
      )
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="flex gap-2">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Las listas restrictivas OFAC y ONU no están al día:{' '}
            {vencidas.map((l) => `${l.nombre}, ${l.sincronizada_en ? `copia del ${fechaCorta(l.sincronizada_en)}` : 'sin descargar'}`).join('; ')}. No se
            puede validar ni procesar un archivo hasta actualizarlas.
          </span>
        </p>
        <div className="mt-2 pl-6">{boton || <p className="text-xs">Pida a un administrador que las actualice desde Migración de cartera.</p>}</div>
      </div>
    )
  }

  return (
    <>
      <SeccionHeader
        title="Listas restrictivas (OFAC y ONU)"
        subtitle={`Copia local de las listas públicas del Tesoro de EE. UU. y del Consejo de Seguridad de la ONU. Al validar un archivo se verifica a cada arrendatario, sin costo de consulta. Con una lista de más de ${data?.dias_max ?? 7} días sin actualizar no se puede validar ni procesar.`}
        right={boton || undefined}
      />
      <SeccionEstado loading={loading} error={error} onRetry={reload}>
        <Tabla head={['Lista', 'Publicada', 'Copia actualizada', 'Registros', 'Estado']}>
          {data?.listas.map((l) => (
            <tr key={l.lista}>
              <Td className="font-semibold">{l.nombre}</Td>
              <Td>{fechaCorta(l.publicada_en)}</Td>
              <Td>{l.sincronizada_en ? fechaHora(l.sincronizada_en) : '—'}</Td>
              <Td>{l.total_registros ? l.total_registros.toLocaleString('es-CO') : '—'}</Td>
              <Td>
                {!l.sincronizada_en ? (
                  <Chip tone="gray">Sin descargar</Chip>
                ) : l.vigente ? (
                  <Chip tone="green">Vigente</Chip>
                ) : (
                  <Chip tone="red">Desactualizada</Chip>
                )}
              </Td>
            </tr>
          ))}
        </Tabla>
        {data && !data.sincronizacion_automatica && (
          <p className="mt-2 text-xs text-ink-500">
            La actualización automática diaria está apagada en el servidor: actualícelas con «Actualizar listas ahora».
          </p>
        )}
      </SeccionEstado>
    </>
  )
}
