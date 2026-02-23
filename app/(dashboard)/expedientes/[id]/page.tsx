/**
 * Página de detalle de expediente
 * HP-57: Vista detallada con 7 tabs
 */

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tabs, Badge, Avatar } from '@/components/ui'
import type { Tab } from '@/components/ui/Tabs'
import {
  IconArrowLeft,
  IconDownload,
  IconCheck,
  IconClock,
  IconFileText,
  IconFolderOpen,
  IconDollarSign,
} from '@/components/icons'
import {
  MOCK_EXPEDIENTES,
  MOCK_INMUEBLES,
  MOCK_SOLICITANTES,
  MOCK_DOCUMENTOS,
  MOCK_ESTUDIO,
  MOCK_CONTRATO,
  MOCK_PAGOS,
  MOCK_COMENTARIOS,
  MOCK_TIMELINE,
} from '@/lib/mock-data'
import { formatCurrency, formatDate } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Tabs disponibles
const TABS: Tab[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'contrato', label: 'Contrato' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'comentarios', label: 'Comentarios' },
  { id: 'timeline', label: 'Timeline' },
]

// Badge de documento
function DocumentoBadge({ estado }: { estado: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    aprobado: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aprobado' },
    pendiente: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
    rechazado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' },
  }
  const c = config[estado] || config.pendiente
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', c.bg, c.text)}>
      {c.label}
    </span>
  )
}

// Icono del timeline por tipo
function TimelineIcon({ tipo }: { tipo: string }) {
  const icons: Record<string, { icon: typeof IconFolderOpen; color: string }> = {
    creacion: { icon: IconFolderOpen, color: 'bg-primary-100 text-primary-600' },
    documento: { icon: IconFileText, color: 'bg-blue-100 text-blue-600' },
    estudio: { icon: IconFileText, color: 'bg-purple-100 text-purple-600' },
    aprobacion: { icon: IconCheck, color: 'bg-green-100 text-green-600' },
    contrato: { icon: IconFileText, color: 'bg-amber-100 text-amber-600' },
    pago: { icon: IconDollarSign, color: 'bg-green-100 text-green-600' },
    comentario: { icon: IconFileText, color: 'bg-gray-100 text-gray-600' },
  }
  const config = icons[tipo] || icons.comentario
  const Icon = config.icon
  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', config.color)}>
      <Icon size={16} />
    </div>
  )
}

export default function ExpedienteDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [activeTab, setActiveTab] = useState('resumen')
  const [nuevoComentario, setNuevoComentario] = useState('')

  // Obtener datos del expediente
  const expediente = MOCK_EXPEDIENTES.find((e) => e.id === id) || MOCK_EXPEDIENTES[0]
  const inmueble = MOCK_INMUEBLES.find((i) => i.id === expediente.inmueble_id) || MOCK_INMUEBLES[0]
  const solicitante = MOCK_SOLICITANTES.find((s) => s.id === expediente.solicitante_id) || MOCK_SOLICITANTES[0]
  const propietario = MOCK_SOLICITANTES[1] // Simular propietario

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <IconArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {expediente.numero_expediente}
              </h1>
              <Badge estado={expediente.estado} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Creado el {formatDate(expediente.fecha_creacion)}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Editar
          </button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            Cambiar estado
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Contenido de tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab: Resumen */}
        {activeTab === 'resumen' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inmueble */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Inmueble</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Dirección:</span> <span className="text-gray-900">{inmueble.direccion}</span></p>
                  <p><span className="text-gray-500">Ciudad:</span> <span className="text-gray-900">{inmueble.ciudad}, {inmueble.barrio}</span></p>
                  <p><span className="text-gray-500">Tipo:</span> <span className="text-gray-900">{inmueble.tipo}</span></p>
                  <p><span className="text-gray-500">Estrato:</span> <span className="text-gray-900">{inmueble.estrato}</span></p>
                  <p><span className="text-gray-500">Canon:</span> <span className="text-gray-900 font-medium">{formatCurrency(inmueble.valor_arriendo)}</span></p>
                </div>
              </div>

              {/* Solicitante */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Solicitante</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Nombre:</span> <span className="text-gray-900">{solicitante.nombres} {solicitante.apellidos}</span></p>
                  <p><span className="text-gray-500">Documento:</span> <span className="text-gray-900">{solicitante.tipo_documento} {solicitante.numero_documento}</span></p>
                  <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{solicitante.email}</span></p>
                  <p><span className="text-gray-500">Teléfono:</span> <span className="text-gray-900">{solicitante.telefono}</span></p>
                  <p><span className="text-gray-500">Ingresos:</span> <span className="text-gray-900 font-medium">{formatCurrency(solicitante.ingresos_mensuales)}</span></p>
                </div>
              </div>

              {/* Codeudor */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Codeudor</h3>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>Sin codeudor registrado</p>
                </div>
              </div>

              {/* Propietario */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Propietario</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Nombre:</span> <span className="text-gray-900">{inmueble.propietario_nombre}</span></p>
                  <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{propietario.email}</span></p>
                  <p><span className="text-gray-500">Teléfono:</span> <span className="text-gray-900">{propietario.telefono}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Documentos */}
        {activeTab === 'documentos' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_DOCUMENTOS.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IconFileText size={20} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{doc.tipo}</span>
                    </div>
                    <DocumentoBadge estado={doc.estado} />
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-2">{doc.nombre}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatDate(doc.fecha)}</span>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <IconDownload size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Estudio */}
        {activeTab === 'estudio' && (
          <div className="p-6">
            <div className="max-w-2xl border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Resultado del estudio</h3>
                <DocumentoBadge estado={MOCK_ESTUDIO.resultado} />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Proveedor</p>
                    <p className="text-gray-900 font-medium">{MOCK_ESTUDIO.proveedor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Score</p>
                    <p className="text-gray-900 font-medium">{MOCK_ESTUDIO.score}/{MOCK_ESTUDIO.score_max}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="text-gray-900">{formatDate(MOCK_ESTUDIO.fecha)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Observaciones</p>
                  <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
                    {MOCK_ESTUDIO.observaciones}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Contrato */}
        {activeTab === 'contrato' && (
          <div className="p-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-gray-500">Estado del contrato:</span>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  Pendiente de firma
                </span>
              </div>

              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">Firmantes</h4>
              <div className="space-y-3">
                {MOCK_CONTRATO.firmantes.map((firmante, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={firmante.nombre} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{firmante.nombre}</p>
                        <p className="text-xs text-gray-500">{firmante.rol}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {firmante.firmado ? (
                        <>
                          <IconCheck size={16} className="text-green-600" />
                          <span className="text-sm text-green-600">Firmado</span>
                          {firmante.fecha_firma && (
                            <span className="text-xs text-gray-500 ml-2">
                              {firmante.fecha_firma}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <IconClock size={16} className="text-amber-600" />
                          <span className="text-sm text-amber-600">Pendiente</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Pagos */}
        {activeTab === 'pagos' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {MOCK_PAGOS.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{pago.tipo}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(pago.monto)}
                      </td>
                      <td className="px-6 py-4">
                        <DocumentoBadge estado={pago.estado === 'completado' ? 'aprobado' : pago.estado} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(pago.fecha)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{pago.referencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Comentarios */}
        {activeTab === 'comentarios' && (
          <div className="p-6">
            <div className="max-w-3xl space-y-4">
              {/* Lista de comentarios */}
              {MOCK_COMENTARIOS.map((comentario) => (
                <div key={comentario.id} className="flex gap-3">
                  <Avatar name={comentario.usuario} size="sm" />
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{comentario.usuario}</span>
                      <span className="text-xs text-gray-500">{comentario.fecha}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comentario.texto}</p>
                  </div>
                </div>
              ))}

              {/* Nuevo comentario */}
              <div className="border-t border-gray-200 pt-4 mt-6">
                <textarea
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe un comentario..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => setNuevoComentario('')}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    Comentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Timeline */}
        {activeTab === 'timeline' && (
          <div className="p-6">
            <div className="max-w-2xl">
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Eventos */}
                <div className="space-y-6">
                  {MOCK_TIMELINE.map((evento) => (
                    <div key={evento.id} className="relative flex gap-4">
                      <TimelineIcon tipo={evento.tipo} />
                      <div className="flex-1 pb-6">
                        <p className="text-sm font-medium text-gray-900">{evento.descripcion}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{evento.usuario}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{evento.fecha}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
