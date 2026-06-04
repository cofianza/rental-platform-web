/**
 * /ingresos — Reporte de ingresos por afianzamiento (admin, solo lectura).
 * Ingreso = tarifa de afianzamiento × contratos activos. IVA según concepto
 * garantía (hoy exento). Para facturación electrónica ir a /facturacion.
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
