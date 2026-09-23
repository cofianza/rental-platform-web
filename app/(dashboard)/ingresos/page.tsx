/**
 * /ingresos — Reporte de ingresos por afianzamiento (admin, solo lectura).
 * Ingreso = la tarifa mensual de cada contrato activo, más IVA (TARIFA_IVA).
 * Para facturación electrónica ir a /facturacion.
 */

'use client'

import { AdminSeccionPage } from '@/components/dashboard/secciones/AdminSeccionPage'
import { IngresosSection } from '@/components/dashboard/secciones/IngresosSection'

export default function IngresosPage() {
  return (
    <AdminSeccionPage label="Ingresos">
      <IngresosSection />
    </AdminSeccionPage>
  )
}
