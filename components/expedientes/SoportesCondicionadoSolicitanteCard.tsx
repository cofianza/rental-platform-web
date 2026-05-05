/**
 * SoportesCondicionadoSolicitanteCard — visible para el solicitante cuando
 * el expediente está en 'condicionado'.
 *
 * El propietario pidió documentación adicional (codeudor, póliza, etc.)
 * — esta card explica el siguiente paso y permite subir los documentos
 * que el propietario revisará antes de aprobar manualmente.
 */

'use client'

import { SoportesCondicionadoSection } from './SoportesCondicionadoSection'

interface SoportesCondicionadoSolicitanteCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
}

export function SoportesCondicionadoSolicitanteCard({
  expedienteId,
  expedienteEstado,
  userRol,
}: SoportesCondicionadoSolicitanteCardProps) {
  if (expedienteEstado !== 'condicionado') return null
  if (userRol !== 'solicitante') return null

  return (
    <div className="border-2 border-amber-200 bg-amber-50/40 rounded-lg p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Documentación adicional solicitada</h3>
          <p className="text-sm text-gray-700">
            Para completar tu solicitud, sube los documentos que el propietario te pidió (codeudor, póliza, certificación laboral, etc.). Cuando estén listos, el propietario los revisará y aprobará tu expediente.
          </p>
        </div>
      </div>

      <SoportesCondicionadoSection expedienteId={expedienteId} permitirSubir={true} />
    </div>
  )
}
