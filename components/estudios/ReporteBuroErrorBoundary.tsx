/**
 * ReporteBuroErrorBoundary
 * Aisla el render del reporte del buro (TransUnion / DataCredito).
 *
 * Los payloads de los buros son JSON crudo de un tercero: un elemento nulo o
 * una seccion con la forma inesperada lanza durante el render y, como la app no
 * tiene error boundary global, desmontaria el arbol entero — el gestor perderia
 * el modal y el listado de expedientes. Con este limite el fallo degrada a un
 * aviso dentro de la tarjeta y el resto del estudio (score, observaciones,
 * documentos) sigue disponible.
 */

'use client'

import { Component, type ReactNode } from 'react'
import { IconAlertTriangle } from '@/components/icons'

interface ReporteBuroErrorBoundaryProps {
  children: ReactNode
}

interface ReporteBuroErrorBoundaryState {
  fallo: boolean
}

export class ReporteBuroErrorBoundary extends Component<
  ReporteBuroErrorBoundaryProps,
  ReporteBuroErrorBoundaryState
> {
  state: ReporteBuroErrorBoundaryState = { fallo: false }

  static getDerivedStateFromError(): ReporteBuroErrorBoundaryState {
    return { fallo: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[ReporteBuroErrorBoundary] el reporte del buró no se pudo renderizar', error)
  }

  render() {
    if (this.state.fallo) {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <IconAlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-900">
              El reporte del buró no se pudo mostrar.
            </p>
            <p className="text-[10px] text-amber-800 mt-1">
              La respuesta del proveedor llegó con un formato inesperado. El resto del estudio (puntaje,
              resultado y observaciones) sigue siendo válido; para revisar el detalle, vuelve a consultar el
              buró o solicita el reporte al proveedor.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
