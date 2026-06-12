'use client'

import { useState, useEffect, useMemo } from 'react'
import { IconX } from '@/components/icons'
import { RichTextEditor } from './RichTextEditor'
import type { IPlantillaContrato, IPlantillaContratoFormData } from '@/types/plantilla-contrato'

interface PlantillaFormModalProps {
  isOpen: boolean
  plantilla: IPlantillaContrato | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: IPlantillaContratoFormData) => void
}

export function PlantillaFormModal({
  isOpen,
  plantilla,
  isSubmitting,
  onClose,
  onSubmit,
}: PlantillaFormModalProps) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [contenido, setContenido] = useState('')
  const [activa, setActiva] = useState(true)

  const isEditing = !!plantilla

  useEffect(() => {
    if (plantilla) {
      setNombre(plantilla.nombre)
      setDescripcion(plantilla.descripcion || '')
      // `|| ''`: las plantillas HTML (V1/V4) pueden llegar sin `contenido` de
      // un backend desactualizado — sin la defensa, .trim() sobre null
      // tumbaba toda la página.
      setContenido(plantilla.contenido || '')
      setActiva(plantilla.activa)
    } else {
      setNombre('')
      setDescripcion('')
      setContenido('')
      setActiva(true)
    }
  }, [plantilla, isOpen])

  const detectedVariables = useMemo(() => {
    const regex = /\{\{(\w+)\}\}/g
    const found = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = regex.exec(contenido)) !== null) {
      found.add(match[1])
    }
    return Array.from(found)
  }, [contenido])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      contenido,
      activa,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              placeholder="Ej: Contrato de arrendamiento vivienda urbana"
            />
          </div>

          {/* Descripcion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripcion
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              placeholder="Descripcion opcional de la plantilla..."
            />
          </div>

          {/* Contenido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenido <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              content={contenido}
              onChange={setContenido}
              placeholder="Escribe el contenido del contrato aqui. Usa el boton 'Variable' para insertar datos dinamicos..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Usa el boton <strong>+ Variable</strong> en la barra de herramientas para insertar datos dinamicos como nombres, documentos, fechas, etc.
            </p>
          </div>

          {/* Variables detectadas */}
          {detectedVariables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variables detectadas ({detectedVariables.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {detectedVariables.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activa */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activa"
              checked={activa}
              onChange={(e) => setActiva(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="activa" className="text-sm text-gray-700">
              Plantilla activa
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nombre.trim() || !contenido.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Guardando...'
                : isEditing
                  ? 'Actualizar'
                  : 'Crear Plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
