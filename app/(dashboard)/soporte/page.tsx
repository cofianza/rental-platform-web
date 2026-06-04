'use client'

import { AdminSeccionPage } from '@/components/dashboard/secciones/AdminSeccionPage'
import { SoporteSection } from '@/components/dashboard/secciones/SoporteSection'

export default function SoportePage() {
  return (
    <AdminSeccionPage label="Soporte">
      <SoporteSection />
    </AdminSeccionPage>
  )
}
