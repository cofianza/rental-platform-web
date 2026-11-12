/**
 * Cómo se ve una foto correcta y una incorrecta, antes de gastar un intento.
 * Ilustraciones propias (siluetas), nunca fotos de personas.
 */

import { IconCheck, IconX } from '@/components/icons'
import { nombreCortoDocumento } from '@/lib/biometria/calidadFoto'

function SelfieCorrecta() {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className="block h-auto w-full">
      <rect width="120" height="96" rx="10" fill="#e3f3ec" />
      <circle cx="100" cy="16" r="8" fill="#fcd34d" />
      <path d="M28 96c4-21 60-21 64 0z" fill="#059669" />
      <ellipse cx="60" cy="44" rx="16" ry="20" fill="#b98a6e" />
      <path d="M44 40c0-17 32-17 32 0c-4-7-28-7-32 0z" fill="#3f322b" />
      <circle cx="54" cy="44" r="1.9" fill="#1f2937" />
      <circle cx="66" cy="44" r="1.9" fill="#1f2937" />
      <path d="M55 53q5 4 10 0" stroke="#1f2937" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="45" rx="26" ry="32" fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="5 4" />
    </svg>
  )
}

function SelfieIncorrecta() {
  // Mismo tono de piel que la correcta: lo que está mal es la luz, el ángulo
  // y las gafas, nunca la persona.
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className="block h-auto w-full">
      <rect width="120" height="96" rx="10" fill="#e3f3ec" />
      <path d="M62 96c3-17 50-17 54 0z" fill="#059669" />
      <ellipse cx="90" cy="58" rx="13" ry="17" fill="#b98a6e" />
      <path d="M75 52c1-15 29-16 30 0z" fill="#3f322b" />
      <rect x="72" y="49" width="36" height="5" rx="2" fill="#3f322b" />
      <rect x="80" y="56" width="9" height="5" rx="2" fill="#030712" />
      <rect x="92" y="56" width="9" height="5" rx="2" fill="#030712" />
      <ellipse cx="60" cy="45" rx="26" ry="32" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
      <rect width="120" height="96" rx="10" fill="#0b1210" opacity=".72" />
    </svg>
  )
}

export function EjemploFotos({ documentoNombre = 'documento' }: { documentoNombre?: string }) {
  const doc = nombreCortoDocumento(documentoNombre)
  // «Cédula completa», «Pasaporte completo», «PPT completo».
  const completo = /^(cédula|tarjeta)/.test(doc) ? 'completa' : 'completo'
  const consejos = [
    'Buena luz, sin gafas ni gorra',
    `${doc.charAt(0).toUpperCase()}${doc.slice(1)} ${completo}, sin reflejos`,
    doc === 'pasaporte' ? 'La página donde está su foto' : 'Del lado donde está su foto',
  ]
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">Así se toman bien:</p>
      <div className="grid grid-cols-2 gap-3">
        <figure className="rounded-xl border-2 border-primary-300 bg-white p-2">
          <SelfieCorrecta />
          <figcaption className="mt-1.5 flex items-start gap-1 text-xs font-semibold text-primary-800">
            <IconCheck size={14} className="mt-px shrink-0" />
            <span>
              <span className="sr-only">Correcta: </span>De frente, con luz
            </span>
          </figcaption>
        </figure>
        <figure className="rounded-xl border-2 border-red-200 bg-white p-2">
          <SelfieIncorrecta />
          <figcaption className="mt-1.5 flex items-start gap-1 text-xs font-semibold text-red-700">
            <IconX size={14} className="mt-px shrink-0" />
            <span>
              <span className="sr-only">Incorrecta: </span>Con poca luz, de lado y con gafas
            </span>
          </figcaption>
        </figure>
      </div>
      <ul className="space-y-1.5 text-sm text-gray-600">
        {consejos.map((c) => (
          <li key={c} className="flex items-start gap-2">
            <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-600" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
