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
import { PendientesFacturarSection } from '@/components/facturacion/PendientesFacturarSection'
import { TarifasIvaSection } from '@/components/facturacion/TarifasIvaSection'
import { PagosCofianzaSection } from '@/components/facturacion/PagosCofianzaSection'
import { useAuthStore } from '@/stores/auth.store'

export default function FacturacionPage() {
  const user = useAuthStore((s) => s.user)
  const isSolicitante = user?.rol === 'solicitante'
  const isInmobiliaria = user?.rol === 'inmobiliaria'
  // Tarifas de IVA son configuracion del emisor (Cofianza). Solo admin/operador
  // las gestionan — propietario e inmobiliaria no necesitan verlas y ademas el
  // endpoint GET esta gateado a esos dos roles, asi que cargarlo dispara 403.
  const canSeeTarifasIva = user?.rol === 'administrador' || user?.rol === 'operador_analista'

  // El solicitante ahora tiene tab 'Datos Fiscales' propio (vs admin que ve
  // los datos del emisor Cofianza). Sin esos datos completos, el backend
  // bloquea la emision con CLIENTE_DATOS_INCOMPLETOS.
  // Pendientes-facturar entre Datos y Facturas: lista pagos completados sin
  // factura emitida con boton para emitirla.
  const tabs: Tab[] = isSolicitante
    ? [
        { id: 'datos-fiscales', label: 'Datos Fiscales' },
        { id: 'pendientes', label: 'Pendientes de facturación' },
        { id: 'facturas', label: 'Mis facturas' },
      ]
    : [
        { id: 'datos-fiscales', label: 'Datos Fiscales' },
        { id: 'pendientes', label: 'Pendientes de facturación' },
        { id: 'facturas', label: 'Facturas' },
        // Tab agregado para la inmobiliaria (mockup 13_v2): comisión por contrato.
        ...(isInmobiliaria ? [{ id: 'pagos-cofianza', label: 'Pagos a Cofianza' }] : []),
      ]

  const [activeTab, setActiveTab] = useState('datos-fiscales')
  // Bump cuando se emite una factura para forzar refresh del tab Mis facturas
  // si el usuario navega despues. FacturasSection no expone refetch directo.
  const [facturasReloadKey, setFacturasReloadKey] = useState(0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSolicitante ? 'Facturación' : 'Facturación'}
        subtitle={
          isSolicitante
            ? 'Completa tus datos fiscales, factura tus pagos pendientes y consulta tu historial.'
            : 'Gestiona tus datos fiscales, factura pagos pendientes y consulta tu historial.'
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
        {activeTab === 'pendientes' && (
          <PendientesFacturarSection
            onFacturaEmitida={() => setFacturasReloadKey((k) => k + 1)}
            onDatosFiscalesIncompletos={() => setActiveTab('datos-fiscales')}
          />
        )}
        {activeTab === 'facturas' && <FacturasSection key={facturasReloadKey} />}
        {activeTab === 'pagos-cofianza' && <PagosCofianzaSection />}
      </div>
    </div>
  )
}
