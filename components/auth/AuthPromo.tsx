'use client'

/**
 * Titular y beneficios del panel izquierdo de las pantallas auth. El
 * arrendatario (registro de solicitante y entrada con enlace mágico) no ve
 * los beneficios del propietario: vitrina, prospectos y pago garantizado no
 * le hablan a quien busca arrendar.
 */

import { usePathname } from 'next/navigation'
import { IconCheckCircle, IconClock, IconDollarSign, IconHome, IconPhone, IconShieldCheck } from '@/components/icons'

type Beneficio = { icon: React.ReactNode; title: string; desc: string }

const PROPIETARIO = {
  titulo: 'Tu inmueble, nuestro respaldo.',
  subtitulo: 'Cofianza firma como fiador en tus contratos.',
  beneficios: [
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
  ] as Beneficio[],
}

const ARRENDATARIO = {
  titulo: 'Arrienda sin codeudor.',
  subtitulo: 'Cofianza firma como tu fiador en el contrato.',
  beneficios: [
    {
      icon: <IconCheckCircle size={16} />,
      title: 'Sin codeudor ni finca raíz',
      desc: 'Cofianza respalda tu contrato como fiador, así no tienes que pedirle el favor a nadie.',
    },
    {
      icon: <IconPhone size={16} />,
      title: 'Tu estudio, desde el celular',
      desc: 'Autorizas la consulta en línea y sigues el avance de tu estudio en tu cuenta.',
    },
    {
      icon: <IconShieldCheck size={16} />,
      title: 'Tus datos, protegidos',
      desc: 'Solo consultamos tu información con tu autorización, según la Ley 1581 de 2012.',
    },
  ] as Beneficio[],
}

const RUTAS_ARRENDATARIO = ['/registro/solicitante', '/auth/confirmar']

export function AuthPromo() {
  const pathname = usePathname() ?? ''
  const p = RUTAS_ARRENDATARIO.some((r) => pathname.startsWith(r)) ? ARRENDATARIO : PROPIETARIO

  return (
    <>
      <h1 className="font-black leading-[1.05] tracking-[-2.5px] text-[clamp(36px,4.5vw,56px)] mb-3.5">
        {p.titulo}
      </h1>
      <p className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(18px,2.2vw,26px)] tracking-[-0.5px] text-white/55 leading-[1.3] mb-8">
        {p.subtitulo} <strong className="text-coral-500 font-normal">Tú arriendas tranquilo.</strong>
      </p>

      <ul className="list-none space-y-0">
        {p.beneficios.map((b) => (
          <li
            key={b.title}
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
    </>
  )
}
