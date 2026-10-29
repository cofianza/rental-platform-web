/**
 * Migración de cartera, Adenda 1 §3 y §7: los datos que no se pidieron para migrar
 * (se le exigen a la inmobiliaria al reportar una mora) y el documento del
 * arrendatario de un contrato PENDIENTE DE IDENTIFICACIÓN. La lista la ven la
 * inmobiliaria (detalle del contrato) y el analista (mora); el registro de las
 * entregas y del documento es del backoffice (tablero del lote).
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { IconAlertTriangle, IconEye, IconPlus, IconTrash, IconUpload } from '@/components/icons'
import { Chip, fechaCorta } from '@/components/dashboard/secciones/_shared'
import { abrirEnPestana } from '@/lib/utils'
import { errorPdf, migracionService } from '@/services/migracionService'
import type { DetalleFilaMigrada, DocumentoDiferido, EstadoDiferidos, PersonaDiferida } from '@/types/migracion'

const TIPOS_DOC = ['CC', 'CE', 'PPT', 'PEP', 'Pasaporte', 'NIT'] as const

const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

/** Solo lectura: qué falta y hasta cuándo. Nada si no falta nada. */
export function ListaDiferidos({ d, intro }: { d: EstadoDiferidos; intro: string }) {
  const pendientes = d.items.filter((i) => i.pendiente)
  if (!pendientes.length) return null
  return (
    <div role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-start gap-2 font-medium">
        <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
        {intro}
      </p>
      <ul className="mt-1 list-disc pl-9">
        {pendientes.map((i) => (
          <li key={i.clave}>{i.etiqueta}</li>
        ))}
      </ul>
      {d.vence_en && <p className="mt-1 pl-6 text-xs">Plazo: hasta el {fechaCorta(d.vence_en)}.</p>}
      {d.vencido && <p className="mt-1 pl-6 text-xs font-semibold text-red-700">El plazo de entrega venció.</p>}
    </div>
  )
}

type Accion = (clave: string, fn: () => Promise<DetalleFilaMigrada>, ok: string) => Promise<boolean>

const personaVacia = (): PersonaDiferida => ({ nombre: '', tipo_documento: 'CC', numero_documento: '', celular: '', email: '' })

/** Backoffice: registra lo que entregó la inmobiliaria, con su fecha. */
export function PanelDiferidos({ det, ocupado, onAccion }: { det: DetalleFilaMigrada; ocupado: string | null; onAccion: Accion }) {
  const d = det.diferidos
  const [celular, setCelular] = useState('')
  const [correo, setCorreo] = useState('')
  const [personas, setPersonas] = useState<PersonaDiferida[]>(() => det.coarrendatarios_entregados ?? [])
  const [sinCoarrendatarios, setSinCoarrendatarios] = useState(det.coarrendatarios_entregados?.length === 0)
  if (!d) return null

  const item = (clave: string) => d.items.find((i) => i.clave === clave)
  const pendienteCelular = !!item('celular')?.pendiente
  const pendienteCorreo = !!item('correo')?.pendiente
  const cambiarPersona = (i: number, campo: keyof PersonaDiferida, valor: string) =>
    setPersonas((ps) => ps.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)))

  const cargar = (documento: DocumentoDiferido, f: File) => {
    const invalido = errorPdf(f)
    if (invalido) return toast.error(invalido)
    void onAccion(`dif-${documento}`, () => migracionService.cargarDiferido(det.id, documento, f), 'Documento cargado')
  }
  const ver = async (documento: DocumentoDiferido) => {
    try {
      await abrirEnPestana(async () => (await migracionService.verDiferido(det.id, documento)).url)
    } catch (e) {
      toast.error((e instanceof Error && e.message) || 'No se pudo abrir el documento')
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-ink-200 p-3">
      <div>
        <p className="text-sm font-semibold text-ink-900">Datos que se piden al reportar una mora</p>
        <p className="mt-0.5 text-xs text-ink-500">
          No se pidieron al migrar: se le exigen a la inmobiliaria cuando se reporte una mora sobre este contrato.
        </p>
        {d.requeridos_en && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-700">
            Solicitados el {fechaCorta(d.requeridos_en)} por una mora. Plazo de entrega: hasta el {fechaCorta(d.vence_en)}.
            {d.vencido && <Chip tone="red">Plazo vencido</Chip>}
          </p>
        )}
      </div>

      <ul className="space-y-1 text-xs text-ink-700">
        {d.items.map((i) => (
          <li key={i.clave} className="flex flex-wrap items-center gap-2">
            <span className="min-w-56">{i.etiqueta}</span>
            {i.pendiente ? (
              <Chip tone="yellow">Pendiente</Chip>
            ) : i.entregado_en ? (
              <Chip tone="green">Entregado el {fechaCorta(i.entregado_en)}</Chip>
            ) : (
              <Chip tone="gray">Ya registrado</Chip>
            )}
          </li>
        ))}
      </ul>

      {(pendienteCelular || pendienteCorreo) && (
        <div className="flex flex-wrap items-end gap-2 border-t border-ink-100 pt-3">
          {pendienteCelular && (
            <label className="text-xs font-medium text-gray-700">
              Celular del arrendatario
              <input type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} className={`${INPUT} mt-1 block w-48`} disabled={!!ocupado} />
            </label>
          )}
          {pendienteCorreo && (
            <label className="text-xs font-medium text-gray-700">
              Correo electrónico del arrendatario
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className={`${INPUT} mt-1 block w-64`} disabled={!!ocupado} />
            </label>
          )}
          <Button
            tamano="sm"
            disabled={!!ocupado || (!celular.trim() && !correo.trim())}
            onClick={() =>
              onAccion(
                'dif-contacto',
                () => migracionService.registrarDiferidos(det.id, { celular: celular.trim() || undefined, correo: correo.trim() || undefined }),
                'Datos guardados',
              )
            }
          >
            {ocupado === 'dif-contacto' ? 'Guardando…' : 'Guardar contacto'}
          </Button>
        </div>
      )}

      <div className="space-y-2 border-t border-ink-100 pt-3">
        <p className="text-xs font-semibold text-ink-700">Coarrendatarios</p>
        <label className="flex items-center gap-2 text-xs text-gray-900">
          <input
            type="checkbox"
            checked={sinCoarrendatarios}
            onChange={(e) => setSinCoarrendatarios(e.target.checked)}
            disabled={!!ocupado}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          El contrato no tiene coarrendatarios
        </label>
        {!sinCoarrendatarios &&
          personas.map((p, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg bg-ink-50 p-2 sm:grid-cols-6">
              <label className="text-xs font-medium text-gray-700 sm:col-span-2">
                Nombre completo
                <input value={p.nombre} onChange={(e) => cambiarPersona(i, 'nombre', e.target.value)} className={`${INPUT} mt-1`} disabled={!!ocupado} />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Tipo de documento
                <select value={p.tipo_documento} onChange={(e) => cambiarPersona(i, 'tipo_documento', e.target.value)} className={`${INPUT} mt-1`} disabled={!!ocupado}>
                  {TIPOS_DOC.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-700">
                Número de documento
                <input value={p.numero_documento} onChange={(e) => cambiarPersona(i, 'numero_documento', e.target.value)} className={`${INPUT} mt-1`} disabled={!!ocupado} />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Celular
                <input type="tel" value={p.celular} onChange={(e) => cambiarPersona(i, 'celular', e.target.value)} className={`${INPUT} mt-1`} disabled={!!ocupado} />
              </label>
              <div className="flex items-end gap-2">
                <label className="flex-1 text-xs font-medium text-gray-700">
                  Correo electrónico
                  <input type="email" value={p.email} onChange={(e) => cambiarPersona(i, 'email', e.target.value)} className={`${INPUT} mt-1`} disabled={!!ocupado} />
                </label>
                <Button
                  variante="secondary"
                  tamano="sm"
                  aria-label="Quitar coarrendatario"
                  disabled={!!ocupado}
                  onClick={() => setPersonas((ps) => ps.filter((_, k) => k !== i))}
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            </div>
          ))}
        <div className="flex flex-wrap gap-2">
          {!sinCoarrendatarios && (
            <Button variante="secondary" tamano="sm" disabled={!!ocupado || personas.length >= 10} onClick={() => setPersonas((ps) => [...ps, personaVacia()])}>
              <IconPlus size={14} /> Agregar coarrendatario
            </Button>
          )}
          <Button
            tamano="sm"
            disabled={!!ocupado || (!sinCoarrendatarios && personas.length === 0)}
            onClick={() =>
              onAccion(
                'dif-coarrendatarios',
                () => migracionService.registrarDiferidos(det.id, { coarrendatarios: sinCoarrendatarios ? [] : personas }),
                'Datos guardados',
              )
            }
          >
            {ocupado === 'dif-coarrendatarios' ? 'Guardando…' : 'Guardar coarrendatarios'}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t border-ink-100 pt-3">
        {(['contrato_firmado', 'historial_pagos'] as const).map((doc) => (
          <div key={doc} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="min-w-56 font-semibold text-ink-700">{item(doc)?.etiqueta}</span>
            <label
              htmlFor={`diferido-${doc}`}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <IconUpload size={14} /> {ocupado === `dif-${doc}` ? 'Cargando…' : 'Cargar PDF'}
            </label>
            <input
              id={`diferido-${doc}`}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={!!ocupado}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) cargar(doc, f)
              }}
            />
            {item(doc)?.entregado_en && (
              <Button variante="secondary" tamano="sm" disabled={!!ocupado} onClick={() => ver(doc)}>
                <IconEye size={14} /> Ver
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Backoffice: el contrato no trae el documento del arrendatario (Adenda 1 §7). */
export function IdentificacionPendiente({
  det,
  ocupado,
  onRegistrar,
}: {
  det: DetalleFilaMigrada
  ocupado: string | null
  onRegistrar: (tipo: string, numero: string) => void
}) {
  const inicial = det.datos.arrendatario.tipo_documento ?? 'cc'
  const [tipo, setTipo] = useState<string>(TIPOS_DOC.find((t) => t.toLowerCase() === inicial.toLowerCase()) ?? 'CC')
  const [numero, setNumero] = useState(det.datos.arrendatario.numero_documento ?? '')
  const activo = det.lote?.estado === 'activo'
  const vencido = !!det.identificacion_vence_en && Date.now() > Date.parse(det.identificacion_vence_en)

  return (
    <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold">
        <IconAlertTriangle size={16} /> Pendiente de identificación
      </p>
      <p className="mt-1 text-xs">
        El archivo no trajo el documento del arrendatario. El contrato figura en el acta, pero no tiene cobertura.{' '}
        {!activo
          ? 'El documento se registra aquí cuando se firme el acta del lote.'
          : vencido
            ? `El plazo para entregarlo venció el ${fechaCorta(det.identificacion_vence_en)}: el contrato no se migra.`
            : `La inmobiliaria debe entregarlo a más tardar el ${fechaCorta(det.identificacion_vence_en)}; la fianza se activa el día en que usted lo registre.`}
      </p>
      {activo && !vencido && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-gray-700">
            Tipo de documento
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${INPUT} mt-1 block w-36 bg-white`} disabled={!!ocupado}>
              {TIPOS_DOC.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-700">
            Número de documento
            <input value={numero} onChange={(e) => setNumero(e.target.value)} className={`${INPUT} mt-1 block w-48 bg-white`} disabled={!!ocupado} />
          </label>
          <Button tamano="sm" disabled={!!ocupado || numero.trim().length < 3} onClick={() => onRegistrar(tipo, numero.trim())}>
            {ocupado === 'identificar' ? 'Registrando…' : 'Registrar documento'}
          </Button>
        </div>
      )}
    </div>
  )
}
