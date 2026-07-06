/**
 * Página de configuración del sistema
 * HP-57: Lista de secciones de configuración
 */

'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { IconBuilding2, IconFileText, IconBell, IconSettings, IconUsers, IconChevronRight, IconReceipt, IconUser, IconBank, IconCalendar } from '@/components/icons'

// Configuración de secciones. `soloRoles` (opcional) restringe la visibilidad.
const SECCIONES: Array<{
  id: string
  href?: string
  titulo: string
  descripcion: string
  icon: typeof IconBuilding2
  color: string
  soloRoles?: string[]
}> = [
  {
    id: 'cuenta',
    href: '/configuracion/cuenta',
    titulo: 'Mi cuenta',
    descripcion: 'Edita tu nombre, teléfono, documento de identidad y demás datos personales.',
    icon: IconUser,
    color: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'datos-contrato',
    href: '/configuracion/datos-contrato',
    titulo: 'Datos para contrato',
    descripcion: 'Logo, domicilio, cuenta de recaudo y matrícula que aparecen en los contratos.',
    icon: IconBuilding2,
    color: 'bg-primary-100 text-primary-600',
    soloRoles: ['propietario', 'inmobiliaria'],
  },
  {
    id: 'mi-inmobiliaria',
    href: '/configuracion/mi-inmobiliaria',
    titulo: 'Mi Inmobiliaria',
    descripcion: 'Documentos legales: Cámara de Comercio, RUT, Matrícula, Cédula RL y Contrato Marco.',
    icon: IconFileText,
    color: 'bg-amber-100 text-amber-700',
    soloRoles: ['propietario', 'inmobiliaria'],
  },
  {
    id: 'equipo',
    href: '/configuracion/equipo',
    titulo: 'Equipo',
    descripcion: 'Invita a tu equipo a gestionar la cartera de la inmobiliaria en conjunto.',
    icon: IconUsers,
    color: 'bg-violet-100 text-violet-600',
    soloRoles: ['inmobiliaria'],
  },
  {
    id: 'creditos-estudios',
    href: '/configuracion/creditos-estudios',
    titulo: 'Créditos de estudios',
    descripcion: 'Compre paquetes de estudios y libérelos manualmente para sus solicitantes.',
    icon: IconReceipt,
    color: 'bg-emerald-100 text-emerald-600',
    soloRoles: ['inmobiliaria'],
  },
  {
    id: 'disponibilidad',
    href: '/disponibilidad',
    titulo: 'Disponibilidad de visitas',
    descripcion: 'Define tus horarios para que los interesados agenden visitas solo en los espacios libres.',
    icon: IconCalendar,
    color: 'bg-cyan-100 text-cyan-600',
    soloRoles: ['propietario', 'inmobiliaria'],
  },
  {
    // La pestaña "Visitas" se quitó del nav de la oficina virtual; queda
    // accesible desde aquí (y desde cada expediente).
    id: 'visitas',
    href: '/citas',
    titulo: 'Visitas',
    descripcion: 'Agenda y tablero de las visitas a tus inmuebles.',
    icon: IconCalendar,
    color: 'bg-teal-100 text-teal-600',
    soloRoles: ['inmobiliaria'],
  },
  {
    id: 'empresa',
    href: '/configuracion/empresa',
    titulo: 'Datos de la empresa (Cofianza)',
    descripcion: 'Identidad de COFIANZA como firmante (no son tus datos personales): razón social, NIT y el WhatsApp/email donde le llega el enlace para firmar cada contrato y emitir certificados.',
    icon: IconBuilding2,
    color: 'bg-indigo-100 text-indigo-600',
    soloRoles: ['administrador'],
  },
  {
    id: 'tesoreria',
    href: '/configuracion/tesoreria',
    titulo: 'Tesorería',
    descripcion: 'Capital disponible y reserva mínima de Cofianza. Alimenta el "Capital libre" del Centro de Control.',
    icon: IconBank,
    color: 'bg-blue-100 text-blue-600',
    soloRoles: ['administrador'],
  },
  {
    id: 'plantillas-contrato',
    href: '/plantillas-contrato',
    titulo: 'Plantillas de contrato',
    descripcion: 'Gestiona las plantillas de contratos de arrendamiento y documentos legales.',
    icon: IconFileText,
    color: 'bg-blue-100 text-blue-600',
    // Solo roles internos: inmobiliaria/propietario tienen plantillas:['read'],
    // no pueden gestionarlas — mostrarles esta card era engañoso.
    soloRoles: ['administrador', 'operador_analista'],
  },
  {
    id: 'notificaciones',
    href: '/notificaciones',
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
    soloRoles: ['administrador'],
  },
  {
    id: 'usuarios-permisos',
    href: '/usuarios',
    titulo: 'Usuarios y permisos',
    descripcion: 'Administra roles, permisos y accesos de los usuarios del sistema.',
    icon: IconUsers,
    color: 'bg-green-100 text-green-600',
    soloRoles: ['administrador'],
  },
]

export default function ConfiguracionPage() {
  const { user } = useAuth()
  const rol = user?.rol
  const seccionesVisibles = SECCIONES.filter(
    (s) => !s.soloRoles || (rol && s.soloRoles.includes(rol)),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Configuración"
        subtitle="Ajustes y preferencias del sistema"
      />

      {/* Lista de secciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        {seccionesVisibles.map((seccion) => {
          const Icon = seccion.icon
          const content = (
            <>
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
            </>
          )
          return 'href' in seccion && seccion.href ? (
            <Link
              key={seccion.id}
              href={seccion.href}
              className="w-full flex items-center gap-4 p-6 hover:bg-gray-50 transition-colors text-left"
            >
              {content}
            </Link>
          ) : (
            <button
              key={seccion.id}
              className="w-full flex items-center gap-4 p-6 hover:bg-gray-50 transition-colors text-left"
            >
              {content}
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
            <span className="ml-2 text-primary-600">soporte@cofianza.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}
