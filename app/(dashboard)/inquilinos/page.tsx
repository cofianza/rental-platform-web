/**
 * /inquilinos — Inquilinos con contrato activo (admin).
 * Vista + "Ver" al expediente (donde se editan solicitante/estudio/contrato).
 */

'use client'

import { AdminSeccionPage } from '@/components/dashboard/secciones/AdminSeccionPage'
import { InquilinosSection } from '@/components/dashboard/secciones/InquilinosSection'

export default function InquilinosPage() {
  return (
    <AdminSeccionPage label="Inquilinos">
      <InquilinosSection />
    </AdminSeccionPage>
  )
}
