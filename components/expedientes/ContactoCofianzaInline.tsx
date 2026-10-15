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
