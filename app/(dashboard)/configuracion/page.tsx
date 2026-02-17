/**
 * Página de configuración del sistema
 * HP-57: Lista de secciones de configuración
 */

import { PageHeader } from '@/components/ui'
import { IconBuilding2, IconFileText, IconBell, IconSettings, IconUsers, IconChevronRight } from '@/components/icons'

// Configuración de secciones
const SECCIONES = [
  {
    id: 'perfil-empresa',
    titulo: 'Perfil de empresa',
    descripcion: 'Información de la empresa, logo, datos de contacto y configuración fiscal.',
    icon: IconBuilding2,
    color: 'bg-primary-100 text-primary-600',
  },
  {
    id: 'plantillas-contrato',
    titulo: 'Plantillas de contrato',
    descripcion: 'Gestiona las plantillas de contratos de arrendamiento y documentos legales.',
    icon: IconFileText,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones',
    descripcion: 'Configura alertas por email, SMS y notificaciones push del sistema.',
    icon: IconBell,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'integraciones',
    titulo: 'Integraciones',
    descripcion: 'Conecta con pasarelas de pago, centrales de riesgo y servicios externos.',
    icon: IconSettings,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'usuarios-permisos',
    titulo: 'Usuarios y permisos',
    descripcion: 'Administra roles, permisos y accesos de los usuarios del sistema.',
    icon: IconUsers,
    color: 'bg-green-100 text-green-600',
  },
]

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Configuración"
        subtitle="Ajustes y preferencias del sistema"
      />

      {/* Lista de secciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        {SECCIONES.map((seccion) => {
          const Icon = seccion.icon
          return (
            <button
              key={seccion.id}
              className="w-full flex items-center gap-4 p-6 hover:bg-gray-50 transition-colors text-left"
            >
              <div className={`p-3 rounded-lg ${seccion.color}`}>
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">
                  {seccion.titulo}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {seccion.descripcion}
                </p>
              </div>
              <IconChevronRight size={20} className="text-gray-400" />
            </button>
          )
        })}
      </div>

      {/* Información adicional */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Información del sistema</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Versión:</span>
            <span className="ml-2 text-gray-900">2.0.0</span>
          </div>
          <div>
            <span className="text-gray-500">Última actualización:</span>
            <span className="ml-2 text-gray-900">17/02/2026</span>
          </div>
          <div>
            <span className="text-gray-500">Ambiente:</span>
            <span className="ml-2 text-gray-900">Desarrollo</span>
          </div>
          <div>
            <span className="text-gray-500">Soporte:</span>
            <span className="ml-2 text-primary-600">soporte@habitarpropiedades.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}
