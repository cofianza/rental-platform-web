import { ContactoCofianza } from '@/components/public/ContactoCofianza'

/** Tarjeta centrada de todas las pantallas, con los datos de contacto debajo. */
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">{children}</div>
      <ContactoCofianza />
    </div>
  )
}
