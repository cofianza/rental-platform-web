/**
 * Layout para páginas de autenticación.
 *
 * Lado izquierdo: panel oscuro promocional con beneficios (rebranding del
 * cliente — ver cofianza_login v1). Aplica a todas las pantallas auth
 * (login, registro, recuperar/restablecer contrasena, verificar-email)
 * para mantener consistencia visual.
 *
 * Lado derecho: formulario que renderiza la pagina activa (children).
 */

import Link from 'next/link'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'
import { IconArrowLeft } from '@/components/icons'
import { AuthPromo } from '@/components/auth/AuthPromo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 font-[family-name:var(--font-outfit)]">
      {/* Lado izquierdo — promocional oscuro. Queda fijo a la altura de la
          pantalla: con los formularios largos de registro, el panel se estiraba
          con la página y el texto quedaba perdido en un bloque oscuro vacío.
          En ventanas bajas (portátil de 768 px con la barra del navegador) el
          contenido se compacta para caber: así el panel no tiene nada que
          desplazar y la rueda del ratón sobre él mueve la página. Si aun así
          no cabe (ventana muy baja), se desplaza sin pintar barra: una barra
          gris entre el panel y el formulario parecía un error. */}
      <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:self-start overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#0F172A] text-white p-12 [@media(max-height:860px)]:py-6 flex-col">
        {/* Glows decorativos, recortados en su propio contenedor: sueltos, el
            de abajo sobresale 160 px y contaba como contenido desplazable. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-52 -right-40 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 65%)' }}
          />
          <div
            className="absolute -bottom-40 -left-28 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 65%)' }}
          />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <CofianzaLogo />
          <span className="text-[22px] font-black tracking-tight">
            <span className="text-primary-400">co</span>fianza
          </span>
        </Link>

        {/* Contenido hero */}
        <div className="relative z-10 flex-1 flex flex-col justify-center mt-12 [@media(max-height:860px)]:mt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 pl-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-white/60 w-fit mb-6 [@media(max-height:860px)]:mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-primary-400 animate-pulse" />
            Su aliado para arrendar sin riesgo
          </div>

          {/* Titular y beneficios: del propietario, o del arrendatario en su registro */}
          <AuthPromo />
        </div>

        <p className="relative z-10 text-[13px] text-white/30 mt-auto pt-8 [@media(max-height:860px)]:pt-4">
          © 2026 Cofianza S.A.S. · NIT 902.038.122-7 · Itagüí, Antioquia
        </p>
      </div>

      {/* Lado derecho — formulario */}
      <div className="bg-white flex flex-col px-6 py-10 lg:p-12">
        {/* Mobile: link a la landing + logo */}
        <div className="lg:hidden mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-primary-700 transition-colors">
            <IconArrowLeft size={16} />
            <span className="text-sm font-medium">Volver</span>
          </Link>
          <CofianzaLogo size={28} withText textClassName="text-lg" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[520px]">{children}</div>
        </div>
      </div>
    </div>
  )
}
