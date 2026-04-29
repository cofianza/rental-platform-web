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
import { TarifasIvaSection } from '@/components/facturacion/TarifasIvaSection'
import { useAuthStore } from '@/stores/auth.store'

export default function FacturacionPage() {
  const user = useAuthStore((s) => s.user)
  const isSolicitante = user?.rol === 'solicitante'
  // Tarifas de IVA son configuracion del emisor (Cofianza). Solo admin/operador
  // las gestionan — propietario e inmobiliaria no necesitan verlas y ademas el
  // endpoint GET esta gateado a esos dos roles, asi que cargarlo dispara 403.
  const canSeeTarifasIva = user?.rol === 'administrador' || user?.rol === 'operador_analista'

  // El solicitante solo ve la pestaña "Facturas" — los datos fiscales del
  // emisor (Cofianza) están configurados en Factus y los datos del receptor
  // (el solicitante mismo) salen del registro, no requieren ser editados aquí.
  const tabs: Tab[] = isSolicitante
    ? [{ id: 'facturas', label: 'Mis facturas' }]
    : [
        { id: 'datos-fiscales', label: 'Datos Fiscales' },
        { id: 'facturas', label: 'Facturas' },
      ]

  const [activeTab, setActiveTab] = useState(isSolicitante ? 'facturas' : 'datos-fiscales')

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSolicitante ? 'Mis facturas' : 'Facturación'}
        subtitle={
          isSolicitante
            ? 'Aquí encuentras las facturas electrónicas emitidas por Cofianza a tu nombre.'
            : 'Gestiona tus datos fiscales y consulta tus facturas'
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6 space-y-6">
        {activeTab === 'datos-fiscales' && !isSolicitante && (
          <>
            <DatosFiscalesSection />
            {canSeeTarifasIva && <TarifasIvaSection />}
          </>
        )}
        {activeTab === 'facturas' && <FacturasSection />}
      </div>
    </div>
  )
}
