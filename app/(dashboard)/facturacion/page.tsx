/**
 * Pagina de Facturacion - HP-357
 * Tabs: Datos Fiscales | Facturas
 */

'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type Tab } from '@/components/ui/Tabs'
import { DatosFiscalesSection } from '@/components/facturacion/DatosFiscalesSection'
import { DatosFiscalesSolicitanteSection } from '@/components/facturacion/DatosFiscalesSolicitanteSection'
import { FacturasSection } from '@/components/facturacion/FacturasSection'
import { PendientesFacturarSection } from '@/components/facturacion/PendientesFacturarSection'
import { TarifasIvaSection } from '@/components/facturacion/TarifasIvaSection'
import { ReembolsosSection } from '@/components/facturacion/ReembolsosSection'
import { PrimasPorRemitirSection } from '@/components/facturacion/PrimasPorRemitirSection'
import { TarifaMensualSection } from '@/components/facturacion/TarifaMensualSection'
import { useAuthStore } from '@/stores/auth.store'

// useSearchParams necesita un Suspense por encima (si no, la build falla al
// prerenderizar la página).
export default function FacturacionPage() {
  return (
    <Suspense fallback={null}>
      <Facturacion />
    </Suspense>
  )
}

function Facturacion() {
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const isSolicitante = user?.rol === 'solicitante'
  const isAdmin = user?.rol === 'administrador'
  const esEquipoCofianza = isAdmin || user?.rol === 'operador_analista' || user?.rol === 'gerencia_consulta'
  // Tarifas de IVA son configuracion del emisor (Cofianza). Solo admin/operador
  // las gestionan — propietario e inmobiliaria no necesitan verlas y ademas el
  // endpoint GET esta gateado a esos dos roles, asi que cargarlo dispara 403.
  const canSeeTarifasIva = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // P1: devolver plata por Mercado Pago es una decisión de Cofianza (la API
  // también lo exige).
  const canReembolsar = user?.rol === 'administrador'
  // Plan cobro-tarifa-mensual B8: de la inmobiliaria, solo los titulares ven las
  // cuentas de cobro de Cofianza (la API responde 403 SOLO_TITULARES al resto).
  const esTitular = user?.rol === 'inmobiliaria' && user.rol_miembro === 'owner'
  // Mismo criterio una linea arriba: 'Datos Fiscales' pega a
  // /perfil-arrendador/me, cuyo router es roleGuard(admin, inmobiliaria,
  // propietario). Para operador_analista y gerencia_consulta la pestaña —que
  // ademas es la que abre por defecto— era un 403 permanente con el texto crudo
  // del backend ("Roles permitidos: ...") y un "Reintentar" que nunca iba a
  // funcionar. El solicitante tiene su propia version de la pestaña.
  const canSeeDatosFiscales =
    isSolicitante ||
    user?.rol === 'administrador' ||
    user?.rol === 'inmobiliaria' ||
    user?.rol === 'propietario'

  // El solicitante tiene tab 'Datos Fiscales' propio. El admin no ve ahí su
  // perfil personal de arrendador (no factura con él): ve un enlace a los datos
  // de la empresa y las tarifas de IVA. Sin datos completos del cliente, el
  // backend bloquea la emision con CLIENTE_DATOS_INCOMPLETOS.
  // Pendientes-facturar entre Datos y Facturas: lista pagos completados sin
  // factura emitida con boton para emitirla.
  const tabs: Tab[] = isSolicitante
    ? [
        { id: 'datos-fiscales', label: 'Datos Fiscales' },
        { id: 'pendientes', label: 'Pendientes de facturación' },
        { id: 'facturas', label: 'Mis facturas' },
      ]
    : [
        ...(canSeeDatosFiscales ? [{ id: 'datos-fiscales', label: 'Datos Fiscales' }] : []),
        { id: 'pendientes', label: 'Pendientes de facturación' },
        { id: 'facturas', label: 'Facturas' },
        ...(canReembolsar ? [{ id: 'reembolsos', label: 'Reembolsos' }] : []),
        // Adenda de precios §5.1: lo que las inmobiliarias remiten a Cofianza.
        ...(canSeeTarifasIva ? [{ id: 'primas', label: 'Primas por remitir' }] : []),
        // Plan cobro-tarifa-mensual §4: las cuentas de cobro de la tarifa a cada inmobiliaria.
        ...(canSeeTarifasIva ? [{ id: 'tarifa', label: 'Tarifa mensual' }] : []),
        ...(esTitular ? [{ id: 'tarifa', label: 'Cuentas de cobro Cofianza' }] : []),
      ]

  // El solicitante entra a pagar/facturar, no a editar datos fiscales; el
  // equipo de Cofianza, a lo que falta facturar.
  // Los avisos enlazan a una pestaña (/facturacion?tab=reembolsos). La pestaña
  // se deriva en cada render: la que eligió el usuario, si no la del enlace, si
  // no la de su rol; solo cuenta si existe para él (el rol decide qué pestañas hay).
  const pestanaPorDefecto = isSolicitante || isAdmin || !canSeeDatosFiscales ? 'pendientes' : 'datos-fiscales'
  const [tabElegida, setTabElegida] = useState<string | null>(null)
  const existe = (id: string | null): id is string => !!id && tabs.some((t) => t.id === id)
  const tabUrl = searchParams.get('tab')
  const activeTab = existe(tabElegida) ? tabElegida : existe(tabUrl) ? tabUrl : pestanaPorDefecto
  const setActiveTab = setTabElegida
  // Bump cuando se emite una factura para forzar refresh del tab Mis facturas
  // si el usuario navega despues. FacturasSection no expone refetch directo.
  const [facturasReloadKey, setFacturasReloadKey] = useState(0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSolicitante ? 'Mis pagos y facturas' : 'Pagos a Cofianza'}
        subtitle={
          isSolicitante
            ? 'Complete sus datos fiscales, facture sus pagos pendientes y consulte su historial.'
            : esEquipoCofianza
              ? 'Pagos pendientes de facturar, facturas electrónicas emitidas y cobros de Cofianza.'
              : 'Gestione sus datos fiscales, facture pagos pendientes y consulte su historial.'
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="mt-6 space-y-6">
        {activeTab === 'datos-fiscales' && canSeeDatosFiscales && (
          <>
            {isSolicitante ? (
              <DatosFiscalesSolicitanteSection />
            ) : isAdmin ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900">Datos de Cofianza como emisor</h3>
                <p className="mt-1 text-sm text-gray-600">
                  La razón social, el NIT y la dirección de Cofianza se gestionan en Configuración › Datos de la empresa.
                </p>
                <Link
                  href="/configuracion/empresa"
                  className="mt-3 inline-flex text-sm font-medium text-primary-700 hover:text-primary-800"
                >
                  Ir a Datos de la empresa
                </Link>
              </div>
            ) : (
              <DatosFiscalesSection />
            )}
            {canSeeTarifasIva && <TarifasIvaSection />}
          </>
        )}
        {activeTab === 'pendientes' && (
          <PendientesFacturarSection
            onFacturaEmitida={() => setFacturasReloadKey((k) => k + 1)}
            // Solo el solicitante corrige ahí sus propios datos; para los demás
            // los datos que faltan son de quien pagó (el aviso va en la fila).
            onDatosFiscalesIncompletos={isSolicitante ? () => setActiveTab('datos-fiscales') : undefined}
          />
        )}
        {activeTab === 'facturas' && (
          <FacturasSection
            key={facturasReloadKey}
            onFacturarPendiente={() => setActiveTab('pendientes')}
          />
        )}
        {activeTab === 'reembolsos' && canReembolsar && <ReembolsosSection />}
        {activeTab === 'primas' && canSeeTarifasIva && <PrimasPorRemitirSection />}
        {activeTab === 'tarifa' && (canSeeTarifasIva || esTitular) && <TarifaMensualSection />}
      </div>
    </div>
  )
}
