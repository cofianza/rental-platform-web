/**
 * Administración de plataforma: acceso a la integración nuby de una
 * inmobiliaria. Abre el mismo panel del titular, en modo administrador, en un
 * diálogo; no se le pide nada a la API hasta que se abre.
 */

'use client'

import { useState } from 'react'
import { IconPlug } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PanelIntegracionNuby } from './PanelIntegracionNuby'

export function AccesoNubyAdmin({ orgId, orgNombre }: { orgId: string; orgNombre: string }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">Inventario en nuby</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Copia a Cofianza los inmuebles en arriendo que la inmobiliaria lleva en nuby (solo lectura).
        </p>
      </div>
      <Button variante="secondary" onClick={() => setAbierto(true)} className="min-h-10 w-full shrink-0 sm:w-auto">
        <IconPlug size={16} />
        Integración nuby
        <span className="sr-only"> de {orgNombre}</span>
      </Button>

      {abierto && (
        <Modal isOpen onClose={() => setAbierto(false)} title="Integración nuby" description={orgNombre} size="lg">
          <PanelIntegracionNuby modo={{ tipo: 'admin', orgId }} />
        </Modal>
      )}
    </div>
  )
}
