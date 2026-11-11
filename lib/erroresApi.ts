/**
 * Lee el error que lanza apiClient (ApiClientError: `code`, `message` y
 * `details` directamente, sin `.response` de axios) para un formulario: los
 * errores de validación por campo (solo los campos que el formulario conoce) y
 * el texto a mostrar en el aviso.
 */
export interface ErrorDeFormulario {
  code?: string
  /** Texto para el aviso: los mensajes por campo, o el mensaje de la API. */
  mensaje: string | null
  porCampo: Record<string, string>
}

export function leerErrorDeFormulario(err: unknown, campos: readonly string[]): ErrorDeFormulario {
  const e = (err ?? {}) as { code?: unknown; message?: unknown; details?: unknown }
  const code = typeof e.code === 'string' ? e.code : undefined
  const details = Array.isArray(e.details)
    ? (e.details as Array<{ field?: unknown; message?: unknown }>).filter(
        (d): d is { field: string; message: string } => typeof d?.field === 'string' && typeof d?.message === 'string',
      )
    : []
  const porCampo: Record<string, string> = {}
  for (const d of details) if (campos.includes(d.field) && !porCampo[d.field]) porCampo[d.field] = d.message
  const mensaje = details.length > 0
    ? details.map((d) => d.message).join('. ')
    : typeof e.message === 'string' && e.message.trim() ? e.message : null
  return { code, mensaje, porCampo }
}
