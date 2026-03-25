/**
 * Pagina de Facturacion - HP-357
 * Tabs: Datos Fiscales | Facturas
 */

'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type Tab } from '@/components/ui/Tabs'
import { DatosFiscalesSection } from '@/components/facturacion/DatosFiscalesSection'
import { FacturasSection } from '@/components/facturacion/FacturasSection'

const TABS: Tab[] = [
  { id: 'datos-fiscales', label: 'Datos Fiscales' },
  { id: 'facturas', label: 'Facturas' },
]

export default function FacturacionPage() {
  const [activeTab, setActiveTab] = useState('datos-fiscales')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturacion"
        subtitle="Gestiona tus datos fiscales y consulta tus facturas"
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'datos-fiscales' && <DatosFiscalesSection />}
        {activeTab === 'facturas' && <FacturasSection />}
      </div>
    </div>
  )
}
