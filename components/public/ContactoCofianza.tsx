import { IconMail, IconWhatsapp } from '@/components/icons'
import { CONTACTO_COFIANZA } from '@/lib/constants'

/**
 * Pie de contacto de las páginas públicas por token. En TODOS los estados
 * (también vencido, inactivo, error): quien abre el enlace sin contexto
 * necesita un canal de Cofianza, no solo «quien se lo envió».
 */
export function ContactoCofianza() {
  return (
    <div className="mt-4 text-center text-sm text-gray-600">
      <p>¿Dudas sobre este mensaje? Escríbanos:</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <a
          href={`https://wa.me/${CONTACTO_COFIANZA.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 font-medium text-primary-700 hover:bg-gray-50"
        >
          <IconWhatsapp size={16} /> WhatsApp {CONTACTO_COFIANZA.whatsappVisible}
        </a>
        <a
          href={`mailto:${CONTACTO_COFIANZA.email}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 font-medium text-primary-700 hover:bg-gray-50"
        >
          <IconMail size={16} /> {CONTACTO_COFIANZA.email}
        </a>
      </div>
    </div>
  )
}
