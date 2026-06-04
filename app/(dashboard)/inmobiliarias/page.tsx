/**
 * /inmobiliarias — Gestión de aliados inmobiliarios (admin).
 * Lista agregada + CRUD (crear/editar/activar/desactivar) vía userService.
 */

'use client'

import { AdminSeccionPage } from '@/components/dashboard/secciones/AdminSeccionPage'
import { GestionPerfilesPage } from '@/components/dashboard/secciones/GestionPerfilesPage'

export default function InmobiliariasPage() {
  return (
    <AdminSeccionPage label="Inmobiliarias">
      <GestionPerfilesPage rol="inmobiliaria" />
    </AdminSeccionPage>
  )
}
