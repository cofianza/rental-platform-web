/**
 * /propietarios — Gestión de propietarios directos (admin).
 * Lista agregada + CRUD (crear/editar/activar/desactivar) vía userService.
 */

'use client'

import { AdminSeccionPage } from '@/components/dashboard/secciones/AdminSeccionPage'
import { GestionPerfilesPage } from '@/components/dashboard/secciones/GestionPerfilesPage'

export default function PropietariosPage() {
  return (
    <AdminSeccionPage label="Propietarios">
      <GestionPerfilesPage rol="propietario" />
    </AdminSeccionPage>
  )
}
