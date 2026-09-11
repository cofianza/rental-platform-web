/**
 * DocumentosConsultados — Adenda 2 §5.1: "Toda decisión manual debe registrar
 * el usuario que la tomó, la fecha y hora, el fundamento escrito y los
 * documentos que consultó." Casillas con lo que hay en el expediente (el
 * reporte del buró, los documentos y los soportes del solicitante); el
 * analista marca lo que revisó y se guarda por nombre.
 */

'use client'

import { useEffect, useState } from 'react'
import { documentoService } from '@/services/documentoService'
import { expedienteSoportesService } from '@/services/expedienteSoportesService'

const REPORTE_BURO = 'Reporte del buró (evaluación crediticia)'

interface DocumentosConsultadosProps {
  expedienteId: string
  value: string[]
  onChange: (documentos: string[]) => void
  disabled?: boolean
}

export function DocumentosConsultados({ expedienteId, value, onChange, disabled }: DocumentosConsultadosProps) {
  const [opciones, setOpciones] = useState<string[]>([REPORTE_BURO])

  useEffect(() => {
    let cancel = false
    Promise.all([
      documentoService.getDocumentosByExpediente(expedienteId, { limit: 50 }).then((r) => r.documentos).catch(() => []),
      expedienteSoportesService.listar(expedienteId).catch(() => []),
    ]).then(([docs, soportes]) => {
      if (cancel) return
      const nombres = [
        ...docs.map((d) => (d.tipo_documento?.nombre ? `${d.tipo_documento.nombre}: ${d.nombre_original}` : d.nombre_original)),
        ...soportes.map((s) => `Soporte: ${s.nombre_original}`),
      ]
      setOpciones([REPORTE_BURO, ...new Set(nombres)])
    })
    return () => { cancel = true }
  }, [expedienteId])

  const toggle = (nombre: string) =>
    onChange(value.includes(nombre) ? value.filter((v) => v !== nombre) : [...value, nombre])

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700 mb-2">Documentos que consultaste</legend>
      <div className="max-h-44 overflow-y-auto space-y-1.5 rounded-lg border border-gray-200 p-3">
        {opciones.map((nombre) => (
          <label key={nombre} className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={value.includes(nombre)}
              onChange={() => toggle(nombre)}
              disabled={disabled}
              className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="break-all">{nombre}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
