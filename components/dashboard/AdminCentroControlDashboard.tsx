/**
 * Centro de Control — shell de pestañas del dashboard admin.
 * Mockup htmls/15_COFIANZA_Dashboard_Interno_v2.html. Cada pestaña es un
 * componente de sección que carga su propia data real bajo demanda.
 *
 * Navegación: tabs horizontales dentro del layout de la app (sidebar global
 * + header), no un segundo sidebar.
 */

'use client'

import { useState } from 'react'
import type { IconProps } from '@/components/icons'
import {
  IconLayoutDashboard,
  IconBuilding2,
  IconUser,
  IconUsers,
  IconFileText,
  IconDollarSign,
  IconAlertTriangle,
  IconImages,
  IconInbox,
  IconShield,
} from '@/components/icons'
import { ResumenSection } from '@/components/dashboard/secciones/ResumenSection'
import { InmobiliariasSection } from '@/components/dashboard/secciones/InmobiliariasSection'
import { PropietariosSection } from '@/components/dashboard/secciones/PropietariosSection'
import { InquilinosSection } from '@/components/dashboard/secciones/InquilinosSection'
import { ContratosSection } from '@/components/dashboard/secciones/ContratosSection'
import { IngresosSection } from '@/components/dashboard/secciones/IngresosSection'
import { MoraSection } from '@/components/dashboard/secciones/MoraSection'
import { VitrinaSection } from '@/components/dashboard/secciones/VitrinaSection'
import { SoporteSection } from '@/components/dashboard/secciones/SoporteSection'
import { UsuariosSection } from '@/components/dashboard/secciones/UsuariosSection'

type TabKey =
  | 'resumen'
  | 'inmobiliarias'
  | 'propietarios'
  | 'inquilinos'
  | 'contratos'
  | 'ingresos'
  | 'mora'
  | 'vitrina'
  | 'soporte'
  | 'usuarios'

interface TabDef {
  key: TabKey
  label: string
  Icon: React.ComponentType<IconProps>
  grupo: string
  render: () => React.ReactNode
}

const TABS: TabDef[] = [
  { key: 'resumen', label: 'Resumen', Icon: IconLayoutDashboard, grupo: 'Principal', render: () => <ResumenSection /> },
  { key: 'inmobiliarias', label: 'Inmobiliarias', Icon: IconBuilding2, grupo: 'Operación', render: () => <InmobiliariasSection /> },
  { key: 'propietarios', label: 'Propietarios', Icon: IconUser, grupo: 'Operación', render: () => <PropietariosSection /> },
  { key: 'inquilinos', label: 'Inquilinos', Icon: IconUsers, grupo: 'Operación', render: () => <InquilinosSection /> },
  { key: 'contratos', label: 'Contratos', Icon: IconFileText, grupo: 'Operación', render: () => <ContratosSection /> },
  { key: 'ingresos', label: 'Ingresos', Icon: IconDollarSign, grupo: 'Financiero', render: () => <IngresosSection /> },
  { key: 'mora', label: 'Mora', Icon: IconAlertTriangle, grupo: 'Financiero', render: () => <MoraSection /> },
  { key: 'vitrina', label: 'Vitrina', Icon: IconImages, grupo: 'Comercial', render: () => <VitrinaSection /> },
  { key: 'soporte', label: 'Soporte', Icon: IconInbox, grupo: 'Admin', render: () => <SoporteSection /> },
  { key: 'usuarios', label: 'Usuarios', Icon: IconShield, grupo: 'Admin', render: () => <UsuariosSection /> },
]

export function AdminCentroControlDashboard() {
  const [active, setActive] = useState<TabKey>('resumen')
  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0]

  return (
    <div className="space-y-4 font-display">
      {/* Título */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Centro de Control</h1>
        <p className="mt-0.5 text-xs text-ink-500">Vista consolidada de la operación de Cofianza</p>
      </div>

      {/* Tab bar horizontal (scrollable en móvil) */}
      <div className="-mx-1 overflow-x-auto border-b border-ink-200">
        <div className="flex min-w-max gap-0.5 px-1">
          {TABS.map((t) => {
            const isActive = t.key === active
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-bold transition-colors ${
                  isActive
                    ? 'border-coral-500 text-coral-600'
                    : 'border-transparent text-ink-500 hover:bg-coral-50 hover:text-coral-600'
                }`}
              >
                <t.Icon size={15} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido de la sección activa (carga su data bajo demanda) */}
      <div key={active}>{activeTab.render()}</div>
    </div>
  )
}
