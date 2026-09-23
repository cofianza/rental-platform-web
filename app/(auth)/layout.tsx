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
import { IconArrowLeft, IconCheckCircle, IconClock, IconDollarSign, IconHome } from '@/components/icons'

// Beneficios del panel izquierdo — alineados al mockup htmls/02_*.
const BENEFITS: Array<{ icon: React.ReactNode; title: string; desc: string }> = [
  {
    icon: <IconCheckCircle size={16} />,
    title: 'Fiador solidario en cada contrato',
    desc: 'Un codeudor profesional que siempre cumple. Sin excusas, sin demoras.',
  },
  {
    icon: <IconClock size={16} />,
    title: 'Evaluación crediticia en segundos',
    desc: 'Tu candidato paga el estudio, nosotros lo evaluamos al instante.',
  },
  {
    icon: <IconDollarSign size={16} />,
    title: 'Pago garantizado desde día 20',
    desc: 'Si el inquilino entra en mora, Cofianza paga y gestiona el cobro.',
  },
  {
    icon: <IconHome size={16} />,
    title: 'Vitrina + prospectos gratis',
    desc: 'Publica tus inmuebles disponibles y recibe interesados sin costo.',
  },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 font-[family-name:var(--font-outfit)]">
      {/* Lado izquierdo — promocional oscuro */}
      <div className="hidden lg:flex relative overflow-hidden bg-[#0F172A] text-white p-12 flex-col">
        {/* Glows decorativos */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-52 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 65%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-28 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 65%)' }}
        />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <CofianzaLogo />
          <span className="text-[22px] font-black tracking-tight">
            <span className="text-primary-400">co</span>fianza
          </span>
        </Link>

        {/* Contenido hero */}
        <div className="relative z-10 flex-1 flex flex-col justify-center mt-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 pl-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-white/60 w-fit mb-6">
            <span className="w-[7px] h-[7px] rounded-full bg-primary-400 animate-pulse" />
            Tu aliado para arrendar sin riesgo
          </div>

          <h1 className="font-black leading-[1.05] tracking-[-2.5px] text-[clamp(36px,4.5vw,56px)] mb-3.5">
            Tu inmueble, nuestro respaldo.
          </h1>
          <p
            className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(18px,2.2vw,26px)] tracking-[-0.5px] text-white/55 leading-[1.3] mb-8"
          >
            Cofianza firma como fiador en tus contratos.{' '}
            <strong className="text-coral-500 font-normal">Tú arriendas tranquilo.</strong>
          </p>

          <ul className="list-none space-y-0">
            {BENEFITS.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-3.5 py-3.5 border-b border-white/[0.06] last:border-b-0 text-sm text-white/75 leading-[1.5]"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-500/[0.12] flex items-center justify-center shrink-0 text-primary-400">
                  <span className="w-4 h-4 inline-block">{b.icon}</span>
                </div>
                <div>
                  <strong className="text-white font-semibold block text-sm mb-0.5">{b.title}</strong>
                  {b.desc}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[13px] text-white/30 mt-auto pt-8">
          © 2026 Cofianza S.A.S. · NIT 902.038.122 · Itagüí, Antioquia
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
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  )
}
