import { CONTACTO_COFIANZA } from '@/lib/constants'

/** Para textos planos: el mismo canal, sin enlaces. */
export const CONTACTO_COFIANZA_TEXTO = `por WhatsApp (${CONTACTO_COFIANZA.whatsappVisible}) o a ${CONTACTO_COFIANZA.email}`

/**
 * «Comuníquese con Cofianza» con el canal real. Sin él, agotar los reenvíos o
 * una identidad rechazada eran un callejón sin salida para el gestor.
 */
export function ContactoCofianzaInline() {
  return (
    <>
      comuníquese con Cofianza por{' '}
      <a
        href={`https://wa.me/${CONTACTO_COFIANZA.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline"
      >
        WhatsApp ({CONTACTO_COFIANZA.whatsappVisible})
      </a>{' '}
      o a{' '}
      <a href={`mailto:${CONTACTO_COFIANZA.email}`} className="font-semibold underline">
        {CONTACTO_COFIANZA.email}
      </a>
    </>
  )
}

/**
 * El canal de Cofianza para completar una frase («Escríbanos … »): «por WhatsApp
 * (+57 …) o a correo», con enlaces. `className` = el estilo de los enlaces.
 */
export function CanalCofianza({ className = 'font-semibold text-primary-700 hover:underline' }: { className?: string }) {
  return (
    <>
      por{' '}
      <a href={`https://wa.me/${CONTACTO_COFIANZA.whatsapp}`} target="_blank" rel="noopener noreferrer" className={className}>
        WhatsApp {CONTACTO_COFIANZA.whatsappVisible}
      </a>{' '}
      o a{' '}
      <a href={`mailto:${CONTACTO_COFIANZA.email}`} className={className}>
        {CONTACTO_COFIANZA.email}
      </a>
    </>
  )
}
