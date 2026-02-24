/**
 * ComentariosSection - HP-263
 * Sección de comentarios internos del expediente
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { IconLoader, IconRefresh } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { expedienteService } from '@/services/expedienteService'
import type { IComentarioExpediente } from '@/types/expediente'

export interface ComentariosSectionProps {
  expedienteId: string
}

export function ComentariosSection({ expedienteId }: ComentariosSectionProps) {
  const [comentarios, setComentarios] = useState<IComentarioExpediente[]>([])
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComentarios = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await expedienteService.getComentarios(expedienteId)
      setComentarios(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar comentarios'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchComentarios()
  }, [fetchComentarios])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoComentario.trim() || isSending) return

    setIsSending(true)
    try {
      const comentarioCreado = await expedienteService.crearComentario(expedienteId, {
        contenido: nuevoComentario.trim(),
      })
      setComentarios((prev) => [comentarioCreado, ...prev])
      setNuevoComentario('')
      toast.success('Comentario agregado')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al agregar comentario'
      toast.error(message)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchComentarios}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulario para nuevo comentario */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          placeholder="Escribe un comentario interno..."
          rows={3}
          disabled={isSending}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!nuevoComentario.trim() || isSending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending && <IconLoader size={16} className="animate-spin" />}
            Agregar comentario
          </button>
        </div>
      </form>

      {/* Lista de comentarios */}
      {comentarios.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay comentarios aún</p>
          <p className="text-xs mt-1">Sé el primero en agregar un comentario interno</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comentarios.map((comentario) => {
            const nombreCompleto = `${comentario.usuario.nombre} ${comentario.usuario.apellido}`.trim()

            return (
              <div
                key={comentario.id}
                className="flex gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <Avatar name={nombreCompleto} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {nombreCompleto}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(comentario.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comentario.contenido}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
