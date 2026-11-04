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

export const REPORTE_CENTRALES = 'Reporte de las centrales de riesgo (evaluación crediticia)'

interface DocumentosConsultadosProps {
  expedienteId: string
  value: string[]
  onChange: (documentos: string[]) => void
  disabled?: boolean
  /** Cuántos documentos y soportes tiene el estudio (además del reporte), al cargarlos. */
  onCargados?: (cantidad: number) => void
}

export function DocumentosConsultados({ expedienteId, value, onChange, disabled, onCargados }: DocumentosConsultadosProps) {
  const [opciones, setOpciones] = useState<string[]>([REPORTE_CENTRALES])
  const [cargados, setCargados] = useState<number | null>(null)

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
      const unicos = [...new Set(nombres)]
      setOpciones([REPORTE_CENTRALES, ...unicos])
      setCargados(unicos.length)
      onCargados?.(unicos.length)
    })
    return () => { cancel = true }
    // onCargados es un setState del padre: estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expedienteId])

  const toggle = (nombre: string) =>
    onChange(value.includes(nombre) ? value.filter((v) => v !== nombre) : [...value, nombre])

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700">Documentos que consultó</legend>
      <p className="mb-2 text-xs text-gray-500">Marque lo que revisó para decidir: queda en el registro de la decisión.</p>
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
      {cargados === 0 && (
        <p className="mt-1 text-xs text-amber-800">
          Este estudio no tiene documentos ni soportes cargados: solo puede marcar el reporte de las centrales. Si
          necesita revisar el ingreso, pídalos con «Enviar enlace al solicitante».
        </p>
      )}
    </fieldset>
  )
}
