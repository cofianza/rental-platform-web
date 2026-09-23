/**
 * Contrato V3 fuera de borrador (Entregas 5 y 6): EN FIRMA, FIRMA INCOMPLETA,
 * FIANZA ACTIVA o TERMINADO. Todo sale de `estado.enviado`; la verdad la tiene
 * Auco y el API la reconcilia (webhook, barrido y "Actualizar estado"). Aquí ya
 * no se edita nada: se sigue la firma, se reenvía, se reintenta, se cancela, se
 * termina y se carga el acta de entrega e inventario (§12).
 * ponytail: sin sondeo (se refresca al cargar y con el botón); sondeo cada 30 s si en QA se siente lento.
 */

'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import { IconAlertTriangle, IconArrowRight, IconLoader, IconRefresh, IconRotateCw, IconUpload } from '@/components/icons'
import { etiquetaContrato, formatDateTime } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { contratoService } from '@/services/contratoService'
import type { useContratoV3 } from '@/hooks/useContratoV3'
import type { EnvioV3, EstadoFirmanteV3, EstadoSobreV3 } from '@/types/contratoV3'
import { Aviso, Dato } from './campos'
import { ROL_FIRMANTE, VisorDocumentos, useVisor, type DocVisor } from './Paso5Notificaciones'

type Firmante = NonNullable<EnvioV3['sobre']>['firmantes'][number]

const INSIGNIA: Record<EnvioV3['estado'], string> = {
  pendiente_firma: 'border-purple-300 bg-purple-100 text-purple-700',
  firma_incompleta: 'border-red-300 bg-red-100 text-red-700',
  vigente: 'border-green-300 bg-green-100 text-green-700',
  finalizado: 'border-gray-300 bg-gray-100 text-gray-700',
}

/** Lo que acepta el API para archivos del contrato (middleware uploadDoc). */
const TIPOS_ACTA = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES_ACTA = 20 * 1024 * 1024

/** 'AAAA-MM-DD' → '15/01/2027' sin pasar por Date (no corre el día por zona horaria). */
const dia = (iso: string) => iso.split('-').reverse().join('/')

const CHIP: Record<EstadoFirmanteV3, { texto: string; tono: string }> = {
  pendiente: { texto: 'En espera', tono: 'bg-gray-100 text-gray-600' },
  notificado: { texto: 'Su turno', tono: 'bg-purple-100 text-purple-700' },
  firmado: { texto: 'Firmó', tono: 'bg-green-100 text-green-700' },
  rechazado: { texto: 'Rechazó', tono: 'bg-red-100 text-red-700' },
  bloqueado: { texto: 'Bloqueado', tono: 'bg-amber-100 text-amber-800' },
}

/** EN FIRMA con el proceso a medio registrar: lo que el API todavía está haciendo. */
const NOTA_SOBRE: Partial<Record<EstadoSobreV3, string>> = {
  creando: 'Estamos creando el proceso de firma en Auco.',
  completo: 'Firmaron todas las partes: la fianza se activa en unos minutos.',
  incompleto: 'El proceso terminó sin todas las firmas: en unos minutos queda como firma incompleta.',
}

/** Por qué terminó (o no salió) el último proceso de firma. */
function motivoDe(s: EnvioV3['sobre']): string | null {
  if (!s) return null
  switch (s.motivo) {
    case 'EXPIRED':
      return 'Venció el plazo para firmar.'
    case 'REJECTED':
      return s.motivoDetalle ? `Rechazó: ${s.motivoDetalle}` : 'Una de las partes rechazó la firma.'
    case 'CANCELADO':
      return 'El proceso de firma se anuló.'
    case 'AUCO_UPLOAD':
    case 'HUERFANO':
      return `El proceso de firma no se creó en Auco${s.motivoDetalle ? `: ${s.motivoDetalle}` : '.'}`
    default:
      return null
  }
}

interface Props {
  enviado: EnvioV3
  expedienteId: string
  /** false para Gerencia, el miembro de solo lectura o el perfil incompleto: sin acciones. */
  editable: boolean
  banner: ReactNode
  v3: ReturnType<typeof useContratoV3>
}

export function EstadoFirma({ enviado: e, expedienteId, editable, banner, v3 }: Props) {
  const [confirmarReenvio, setConfirmarReenvio] = useState(false)
  const [pedirMotivo, setPedirMotivo] = useState(false)
  const [confirmarReintento, setConfirmarReintento] = useState(false)
  const [pedirMotivoTerminar, setPedirMotivoTerminar] = useState(false)
  const actaRef = useRef<HTMLInputElement>(null)
  const visor = useVisor()
  const reenvioId = useId()
  const { accion } = v3
  const ocupado = accion !== null

  const enFirma = e.estado === 'pendiente_firma'
  const incompleta = e.estado === 'firma_incompleta'
  const activa = e.estado === 'vigente'
  const terminado = e.estado === 'finalizado'
  const firmado = activa || terminado
  const s = e.sobre
  // Un proceso que no se creó en Auco (fallido) no tiene firmantes ni plazo que mostrar.
  const creado = !!s && s.estado !== 'fallido'
  const firmantes = creado ? [...s.firmantes].sort((a, b) => a.orden - b.orden) : []
  // Auco notifica en orden: el turno es del primero que no ha firmado.
  const turno = s?.estado === 'en_firma' ? firmantes.find((f) => f.estado !== 'firmado') : undefined
  const bloqueados = s?.estado === 'en_firma' ? firmantes.filter((f) => f.estado === 'bloqueado') : []
  const nota = !enFirma || e.reintento ? undefined : s ? NOTA_SOBRE[s.estado] : e.identidadPendientes === 0 ? NOTA_SOBRE.creando : undefined
  const motivo = motivoDe(s)

  const docs: DocVisor[] = [
    {
      clave: 'contrato',
      etiqueta: firmado ? 'Documento firmado' : 'Documento enviado a firma',
      cargar: async () => {
        const r = await contratoService.descargarContrato(e.id, { inline: true })
        // Firmado, "Documento firmado" nunca muestra el PDF sin firmas.
        if (firmado && r.firmado === false)
          throw new Error('La versión firmada todavía se está archivando desde Auco. Intenta de nuevo en unos minutos.')
        return r.url
      },
    },
    { clave: 'crc', etiqueta: 'CRC', cargar: v3.crcUrl },
    ...(e.ruta === 'B' ? [{ clave: 'propio', etiqueta: 'Contrato original de la inmobiliaria', cargar: v3.propioUrl }] : []),
    ...(e.acta?.archivos ?? []).map((a, i) => ({
      clave: `acta-${a.id}`,
      etiqueta: i === 0 ? 'Acta de entrega' : `Acta anterior (${formatDateTime(a.subidoEn)})`,
      imagen: /\.(jpe?g|png|webp)$/i.test(a.nombre),
      cargar: () => v3.archivoUrl(e.id, a.id),
    })),
  ]

  const subirActa = async (archivo: File | undefined) => {
    if (!archivo) return
    if (!TIPOS_ACTA.includes(archivo.type)) {
      toast.error('El acta debe ser un PDF o una imagen (JPG, PNG o WebP).')
      return
    }
    if (archivo.size > MAX_BYTES_ACTA) {
      toast.error('El archivo pesa más de 20 MB.')
      return
    }
    if (await v3.subirActa(e.id, archivo)) toast.success('Acta de entrega cargada')
  }

  const actualizar = async () => {
    if (await v3.actualizarFirma()) toast.success('Estado actualizado con Auco')
  }
  const reintentar = async () => {
    if (await v3.reintentar()) toast.success(`Contrato ${e.numero} enviado a firma`)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-bold text-gray-900 md:text-3xl">
            <span>Contrato N° {e.numero}</span>
            <span className={cn('rounded-full border px-2.5 py-0.5 text-sm font-semibold', INSIGNIA[e.estado])}>
              {etiquetaContrato(e.estado, true)}
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {e.ruta === 'B' ? 'Ruta B: contrato de la inmobiliaria con el Anexo de condiciones' : 'Ruta A: contrato de Cofianza'}
          </p>
        </div>
        {editable && activa && (
          <div className="flex flex-wrap gap-2">
            <Button variante="secondary" onClick={() => setPedirMotivoTerminar(true)} disabled={ocupado}>
              {accion === 'terminar' && <IconLoader size={16} className="animate-spin" />}
              Terminar contrato
            </Button>
          </div>
        )}
        {editable && !firmado && (
          <div className="flex flex-wrap gap-2">
            {enFirma && creado && (
              <Button variante="secondary" onClick={actualizar} disabled={ocupado}>
                {accion === 'actualizar' ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
                Actualizar estado
              </Button>
            )}
            {/* Con todas las firmas ya no se cancela (§11.5): el API respondería FIRMA_COMPLETA. */}
            {s?.estado !== 'completo' && (
              <Button variante="secondary" onClick={() => setPedirMotivo(true)} disabled={ocupado}>
                Cancelar contrato
              </Button>
            )}
          </div>
        )}
      </div>
      {banner}

      {e.acta?.pendiente && (
        // §12.1: alerta visible hasta que se cargue el acta; sin ella no se cierra el estudio (§12.2).
        <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <IconAlertTriangle size={22} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-amber-900">Falta el acta de entrega e inventario</p>
            <p className="text-sm text-amber-800">
              {editable
                ? 'Cárgala firmada en «Acta de entrega e inventario», más abajo. Sin ella no se puede cerrar el estudio.'
                : 'La inmobiliaria debe cargarla firmada. Sin ella no se puede cerrar el estudio.'}
            </p>
          </div>
        </div>
      )}

      {incompleta && (
        // Aviso §11.7.4: no se puede cerrar mientras la firma siga incompleta.
        <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <IconAlertTriangle size={22} className="mt-0.5 shrink-0 text-red-600" />
          <div className="min-w-0 space-y-2">
            <p className="font-semibold text-red-900">La fianza de Cofianza no está operando</p>
            <p className="text-sm text-red-800">
              {e.aviso?.texto ??
                'La firma quedó incompleta. Mientras no firmen todas las partes, la fianza no opera y Cofianza no responde por este inmueble.'}
            </p>
            {e.aviso && <p className="text-xs text-red-700">Aviso entregado el {formatDateTime(e.aviso.entregadoEn)}.</p>}
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="font-display text-lg font-bold text-gray-900">Proceso de firma</h2>

        {activa && (
          <Aviso tono="exito">
            {e.fechaActivacion
              ? `Fianza activa desde el ${formatDateTime(e.fechaActivacion)} (hora de Colombia): la última firma registrada por Auco.`
              : 'Fianza activa: firmaron todas las partes.'}
          </Aviso>
        )}
        {activa && e.vigencia && (
          <p className="text-sm text-gray-700">
            Término inicial del {dia(e.vigencia.inicio)} al {dia(e.vigencia.vencimientoInicial)}.{' '}
            {e.vigencia.prorrogas > 0
              ? `Prorrogado automáticamente ${e.vigencia.prorrogas === 1 ? 'una vez' : `${e.vigencia.prorrogas} veces`}: el período actual vence el ${dia(e.vigencia.venceEl)}.`
              : 'Si ninguna de las partes da aviso, al vencer se prorroga automáticamente por el mismo término.'}
          </p>
        )}
        {terminado && (
          <Aviso>
            {e.fechaTerminacion ? `Contrato terminado el ${formatDateTime(e.fechaTerminacion)}. ` : 'Contrato terminado. '}
            {e.fechaActivacion ? `La fianza operó desde el ${formatDateTime(e.fechaActivacion)}; ya no opera.` : 'La fianza ya no opera.'}
          </Aviso>
        )}

        {s && creado && !firmado && (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Dato
              label="Enviado a firma"
              valor={`${formatDateTime(s.enviadoEn)}${s.intento > 1 ? ` (envío ${s.intento})` : ''}`}
            />
            {enFirma && <Dato label="Vence el" valor={formatDateTime(s.expiraEn)} />}
            {turno && <Dato label="Turno de" valor={turno.nombre} />}
          </dl>
        )}

        {incompleta && motivo && <p className="text-sm font-medium text-gray-900">{motivo}</p>}
        {nota && <Aviso>{nota}</Aviso>}
        {enFirma && e.identidadPendientes > 0 && (
          <Aviso>
            Esperando que {e.identidadPendientes === 1 ? '1 firmante verifique' : `${e.identidadPendientes} firmantes verifiquen`} su
            identidad. El proceso de firma sale cuando todos terminen.
          </Aviso>
        )}
        {bloqueados.length > 0 && (
          <Aviso tono="aviso">
            {bloqueados.map((f) => f.nombre).join(', ')} {bloqueados.length === 1 ? 'quedó bloqueado' : 'quedaron bloqueados'} en
            Auco por intentos fallidos con el código. Cofianza debe desbloquearlo; ya le avisamos al equipo.
          </Aviso>
        )}

        {enFirma && e.reintento && (
          <Aviso tono="error">
            <p>{motivo ?? 'El proceso de firma no se creó en Auco.'}</p>
            {editable && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button variante="primary" tamano="sm" onClick={() => setConfirmarReintento(true)} disabled={ocupado}>
                  {accion === 'reintentar' ? <IconLoader size={14} className="animate-spin" /> : <IconRotateCw size={14} />}
                  Reintentar envío
                </Button>
                <span className="text-xs">Consume un crédito de firma.</span>
              </div>
            )}
          </Aviso>
        )}

        {incompleta && editable && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variante="accent"
              onClick={() => setConfirmarReenvio(true)}
              disabled={ocupado || !e.reenvio.puede}
              aria-describedby={e.reenvio.motivo ? reenvioId : undefined}
            >
              {accion === 'reenviar' ? <IconLoader size={16} className="animate-spin" /> : <IconRotateCw size={16} />}
              Reenviar a firma
            </Button>
            {e.reenvio.motivo && (
              <p id={reenvioId} className="text-sm text-gray-600">
                {e.reenvio.motivo}
              </p>
            )}
          </div>
        )}

        {firmantes.length > 0 && <ListaFirmantes firmantes={firmantes} cerrado={s?.estado !== 'en_firma'} />}
        {editable && (enFirma || incompleta) && firmantes.length > 0 && (
          <p className="text-xs text-gray-500">
            ¿Un celular o un correo está mal? Cancela el contrato y créalo de nuevo desde el estudio: el asistente trae lo que
            ya llenaste, corriges el dato y lo vuelves a enviar.
          </p>
        )}
      </section>

      {e.acta && (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900">Acta de entrega e inventario</h2>
            <p className="mt-1 text-sm text-gray-500">
              {e.acta.pendiente
                ? editable
                  ? 'Levántala con estos datos, hazla firmar y cárgala aquí. Queda en «Documentos».'
                  : 'Todavía no se ha cargado.'
                : `Cargada el ${formatDateTime(e.acta.archivos[0].subidoEn)}. La puedes ver en «Documentos».`}
            </p>
          </div>
          {!e.acta.pendiente && editable && (
            // §12.2: con el acta cargada ya se puede cerrar el estudio; es lo que sigue.
            <Aviso tono="exito">
              <p>
                Siguiente paso: cierra el estudio desde su página, con «Cambiar estado».
              </p>
              <Link
                href={`/expedientes/${expedienteId}`}
                className="mt-1 inline-flex items-center gap-1 font-semibold underline hover:no-underline"
              >
                Ir al estudio <IconArrowRight size={14} />
              </Link>
            </Aviso>
          )}
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Dato label="Inmueble" valor={[e.acta.datos.inmueble.direccion, e.acta.datos.inmueble.municipio].filter(Boolean).join(', ') || '—'} />
            <Dato label="Entrega material" valor={e.acta.datos.fechaEntrega ? dia(e.acta.datos.fechaEntrega) : '—'} />
            <Dato label="Amoblado" valor={e.acta.datos.amoblado == null ? '—' : e.acta.datos.amoblado ? 'Sí' : 'No'} />
            <Dato
              label="Partes"
              valor={e.acta.datos.partes.map((p) => `${ROL_FIRMANTE[p.rol] ?? p.rol}: ${p.nombre}`).join(' · ') || '—'}
            />
          </dl>
          {editable && (
            <div>
              <Button variante={e.acta.pendiente ? 'primary' : 'secondary'} onClick={() => actaRef.current?.click()} disabled={ocupado}>
                {accion === 'acta' ? <IconLoader size={16} className="animate-spin" /> : <IconUpload size={16} />}
                {e.acta.pendiente ? 'Cargar el acta firmada' : 'Cargar otra versión'}
              </Button>
              <p className="mt-1 text-xs text-gray-500">PDF o imagen, máximo 20 MB.</p>
              {/* sr-only y no `hidden`: Safari de iOS no abre el selector de un input con display:none. */}
              <input
                ref={actaRef}
                type="file"
                accept={TIPOS_ACTA.join(',')}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(ev) => {
                  void subirActa(ev.target.files?.[0])
                  ev.target.value = ''
                }}
              />
            </div>
          )}
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900">Documentos</h2>
          <p className="mt-1 text-sm text-gray-500">
            {e.ruta === 'B'
              ? 'Lo que se firma es un solo PDF: el contrato de la inmobiliaria, el Anexo de condiciones y el CRC.'
              : 'Lo que se firma es un solo PDF: el contrato y el CRC.'}
          </p>
        </div>
        <VisorDocumentos docs={docs} visor={visor} />
      </section>

      <ConfirmDialog
        isOpen={confirmarReenvio}
        onClose={() => setConfirmarReenvio(false)}
        onConfirm={async () => {
          if (await v3.reenviar()) toast.success(`Contrato ${e.numero} reenviado a firma`)
        }}
        title="¿Reenviar a firma?"
        message="Se crea un proceso de firma nuevo en Auco con el mismo documento: todas las partes vuelven a firmar, en el mismo orden. Cada envío consume un crédito de firma."
        confirmLabel="Reenviar a firma"
        isLoading={accion === 'reenviar'}
      />
      <ConfirmDialog
        isOpen={confirmarReintento}
        onClose={() => setConfirmarReintento(false)}
        onConfirm={reintentar}
        title="¿Reintentar el envío a firma?"
        message="Se crea el proceso de firma en Auco con el documento enviado y se notifica a todas las partes. Consume un crédito de firma."
        confirmLabel="Reintentar envío"
        isLoading={accion === 'reintentar'}
      />
      <MotivoDialog
        isOpen={pedirMotivoTerminar}
        onClose={() => setPedirMotivoTerminar(false)}
        onConfirm={async (texto) => {
          // Si falla, el diálogo sigue abierto con el motivo escrito.
          if (!(await v3.terminar(e.id, texto))) return false
          setPedirMotivoTerminar(false)
          toast.success(`Contrato ${e.numero} terminado`)
        }}
        title="¿Terminar el contrato?"
        descripcion="No se puede deshacer. La fianza deja de operar y el inmueble queda disponible (fuera de la vitrina). El estudio se cierra aparte, con el acta de entrega."
        label="Motivo de la terminación"
        confirmLabel="Terminar contrato"
        variant="danger"
        isLoading={accion === 'terminar'}
      />
      <MotivoDialog
        isOpen={pedirMotivo}
        onClose={() => setPedirMotivo(false)}
        onConfirm={async (texto) => {
          if (!(await v3.cancelar(e.id, texto, e.estado))) return false
          setPedirMotivo(false)
          toast.success(`Contrato ${e.numero} cancelado`)
        }}
        title="¿Cancelar el contrato?"
        descripcion={
          enFirma
            ? `Se anula el proceso de firma en Auco, el número ${e.numero} queda anulado y el inmueble se libera.`
            : `El número ${e.numero} queda anulado y el inmueble se libera.`
        }
        label="Motivo de la cancelación"
        confirmLabel="Cancelar contrato"
        variant="danger"
        isLoading={accion === 'cancelar'}
      />
    </>
  )
}

/** Con el proceso cerrado (vencido, rechazado, anulado) nadie tiene "su turno": quien no firmó, no firmó. */
const NO_FIRMO = { texto: 'No firmó', tono: 'bg-gray-100 text-gray-600' }

function ListaFirmantes({ firmantes, cerrado }: { firmantes: Firmante[]; cerrado: boolean }) {
  return (
    <ol aria-label="Firmantes en orden de firma" className="divide-y divide-gray-100 rounded-xl border border-gray-200">
      {firmantes.map((f) => (
        <li key={f.orden} className="flex flex-wrap items-center gap-3 p-3">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600"
          >
            {f.orden}
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium text-gray-900">{f.nombre}</p>
            <p className="text-xs text-gray-500">
              {ROL_FIRMANTE[f.rol] ?? f.rol}
              {f.firmadoEn && ` · firmó el ${formatDateTime(f.firmadoEn)}`}
            </p>
            {/* A donde Auco manda el enlace: si la firma no llega, lo primero es revisar estos datos. */}
            {f.estado !== 'firmado' && (f.telefono || f.email) && (
              <p className="break-all text-xs text-gray-500">
                {[f.telefono && `WhatsApp ${f.telefono}`, f.email].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {(() => {
            const chip = cerrado && f.estado !== 'firmado' && f.estado !== 'rechazado' ? NO_FIRMO : CHIP[f.estado]
            return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', chip.tono)}>{chip.texto}</span>
          })()}
        </li>
      ))}
    </ol>
  )
}
