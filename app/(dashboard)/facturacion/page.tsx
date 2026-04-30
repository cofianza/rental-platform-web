/**
 * Pagina de Facturacion - HP-357
 * Tabs: Datos Fiscales | Facturas
 */

'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type Tab } from '@/components/ui/Tabs'
import { DatosFiscalesSection } from '@/components/facturacion/DatosFiscalesSection'
import { DatosFiscalesSolicitanteSection } from '@/components/facturacion/DatosFiscalesSolicitanteSection'
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

  // El solicitante ahora tiene tab 'Datos Fiscales' propio (vs admin que ve
  // los datos del emisor Cofianza). Sin esos datos completos, el backend
  // bloquea la emision con CLIENTE_DATOS_INCOMPLETOS.
  const tabs: Tab[] = isSolicitante
    ? [
        { id: 'datos-fiscales', label: 'Datos Fiscales' },
        { id: 'facturas', label: 'Mis facturas' },
      ]
    : [
        { id: 'datos-fiscales', label: 'Datos Fiscales' },
        { id: 'facturas', label: 'Facturas' },
      ]

  const [activeTab, setActiveTab] = useState('datos-fiscales')

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSolicitante ? 'Facturación' : 'Facturación'}
        subtitle={
          isSolicitante
            ? 'Completa tus datos fiscales y consulta las facturas que Cofianza emite a tu nombre.'
            : 'Gestiona tus datos fiscales y consulta tus facturas'
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6 space-y-6">
        {activeTab === 'datos-fiscales' && (
          <>
            {isSolicitante ? (
              <DatosFiscalesSolicitanteSection />
            ) : (
              <>
                <DatosFiscalesSection />
                {canSeeTarifasIva && <TarifasIvaSection />}
              </>
            )}
          </>
        )}
        {activeTab === 'facturas' && <FacturasSection />}
      </div>
    </div>
  )
}
