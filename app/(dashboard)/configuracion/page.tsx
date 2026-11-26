/**
 * Página de configuración del sistema
 * HP-57: Lista de secciones de configuración
 */

'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { IconBuilding2, IconFileText, IconBell, IconUsers, IconChevronRight, IconUser, IconBank, IconCalendar, IconCreditCard, IconAlertTriangle } from '@/components/icons'
import { RUTA_DATOS_INMOBILIARIA, tituloDatosArrendador } from '@/lib/datosArrendador'

// Configuración de secciones. `soloRoles` (opcional) restringe la visibilidad.
const SECCIONES: Array<{
  id: string
  href: string
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
    descripcion: 'Edite su nombre, teléfono, documento de identidad y demás datos personales.',
    icon: IconUser,
    color: 'bg-sky-100 text-sky-600',
  },
  // Reporte de la Oficina Virtual (25-nov), punto 13: «Datos para contrato» y «Mi Inmobiliaria» son un solo lugar
  // (el título cambia para el propietario: tituloDatosArrendador).
  {
    id: 'datos-inmobiliaria',
    href: RUTA_DATOS_INMOBILIARIA,
    titulo: 'Datos de mi inmobiliaria',
    descripcion: 'Razón social, NIT, logo, domicilio, cuenta de recaudo y matrícula de sus contratos y facturas, su contacto y sus documentos legales.',
    icon: IconBuilding2,
    color: 'bg-primary-100 text-primary-600',
    soloRoles: ['propietario', 'inmobiliaria'],
  },
  {
    id: 'equipo',
    href: '/configuracion/equipo',
    titulo: 'Equipo',
    descripcion: 'Invite a su equipo a gestionar la cartera de la inmobiliaria en conjunto.',
    icon: IconUsers,
    color: 'bg-violet-100 text-violet-600',
    soloRoles: ['inmobiliaria'],
  },
  // Reporte de la Oficina Virtual (25-nov), punto 9: para la inmobiliaria, los cupos de estudios se gestionan solo en
  // Pagos › Cupos de estudios, y las visitas y sus horarios están en Inmuebles (Visitas, Horarios de visita): sus
  // tarjetas ya no van aquí. El propietario conserva la de horarios (su menú lateral no cambió).
  {
    id: 'disponibilidad',
    href: '/disponibilidad',
    titulo: 'Horarios de visita',
    descripcion: 'Defina sus horarios para que los interesados agenden visitas solo en los espacios libres.',
    icon: IconCalendar,
    color: 'bg-cyan-100 text-cyan-600',
    soloRoles: ['propietario'],
  },
  {
    id: 'empresa',
    href: '/configuracion/empresa',
    titulo: 'Datos de la empresa (Cofianza)',
    descripcion: 'Identidad de COFIANZA como firmante (no son sus datos personales): razón social, NIT y el WhatsApp/email donde le llega el enlace para firmar cada contrato y emitir certificados.',
    icon: IconBuilding2,
    color: 'bg-indigo-100 text-indigo-600',
    soloRoles: ['administrador'],
  },
  {
    id: 'avisos-servicio',
    href: '/configuracion/avisos-servicio',
    titulo: 'Avisos de servicio',
    descripcion: 'Cuando falle WhatsApp, el correo, los pagos o la firma, publique un banner para inmobiliarias, propietarios o prospectos con qué hacer mientras tanto.',
    icon: IconAlertTriangle,
    color: 'bg-rose-100 text-rose-600',
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
    descripcion: 'Gestione las plantillas de contratos de arrendamiento y documentos legales.',
    icon: IconFileText,
    color: 'bg-blue-100 text-blue-600',
    // Solo roles internos: inmobiliaria/propietario tienen plantillas:['read'],
    // no pueden gestionarlas — mostrarles esta card era engañoso.
    soloRoles: ['administrador', 'operador_analista'],
  },
  {
    // Rutas huérfanas (no están en el sidebar): este hub es su única entrada.
    id: 'tipos-documento',
    href: '/tipos-documento',
    titulo: 'Tipos de documento',
    descripcion: 'Catálogo de documentos que se le piden al solicitante en cada estudio.',
    icon: IconFileText,
    color: 'bg-slate-100 text-slate-600',
    soloRoles: ['administrador'],
  },
  {
    id: 'paquetes-creditos',
    href: '/admin/paquetes-creditos-estudios',
    titulo: 'Paquetes de cupos de estudios',
    descripcion: 'Precios, cantidades y vigencia de los paquetes que compran las inmobiliarias.',
    icon: IconCreditCard,
    color: 'bg-emerald-100 text-emerald-600',
    soloRoles: ['administrador'],
  },
  {
    // /notificaciones es el historial de avisos, no una pantalla de
    // preferencias: el título y la descripción decían lo contrario.
    id: 'notificaciones',
    href: '/notificaciones',
    titulo: 'Historial de notificaciones',
    descripcion: 'Consulte todo lo que le hemos notificado: visitas, evaluaciones, contratos y pagos.',
    icon: IconBell,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'usuarios-permisos',
    href: '/usuarios',
    titulo: 'Usuarios y permisos',
    descripcion: 'Administre roles, permisos y accesos de los usuarios del sistema.',
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
          return (
            <Link
              key={seccion.id}
              href={seccion.href}
              className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-6 hover:bg-gray-50 transition-colors text-left"
            >
              <div className={`p-3 rounded-lg shrink-0 ${seccion.color}`}>
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900">
                  {seccion.id === 'datos-inmobiliaria' ? tituloDatosArrendador(rol) : seccion.titulo}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {seccion.descripcion}
                </p>
              </div>
              <IconChevronRight size={20} className="text-gray-500 shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
