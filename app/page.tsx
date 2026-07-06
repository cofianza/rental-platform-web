/**
 * Landing Cofianza — propuesta v3 del cliente.
 *
 * Estructura: Hero (oscuro con mock + stats) -> Problema (4 cards) ->
 * Como funciona (3 pasos) -> Counters -> Audiencias (3 cards) ->
 * Comparacion -> FAQ -> CTA final.
 *
 * La vitrina de inmuebles vive en /vitrina (link en el navbar). Aqui
 * solo dejamos un teaser link en la audiencia "arrendatarios".
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'
import { VitrinaPreview } from '@/components/vitrina/VitrinaPreview'

export const metadata: Metadata = {
  title: 'Cofianza — ¿Te pidieron fiador? Soy yo. Llámanos.',
  description:
    'Afianzadora digital en Colombia. Respaldamos tu contrato de arrendamiento para que no tengas que buscar codeudor. Estudio en segundos, firma por WhatsApp, cashback 30%.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      <PublicNavbar />

      {/* ════════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        {/* Glow blobs */}
        <div className="absolute -top-1/4 -right-1/12 w-[700px] h-[700px] bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-1/4 -left-1/12 w-[500px] h-[500px] bg-coral-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-20 md:py-28 lg:py-32">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            {/* Copy izquierdo */}
            <div className="flex-1 max-w-2xl">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mb-7">
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                Disponible en toda Colombia · 100% digital
              </span>

              <h1 className="font-black text-5xl sm:text-6xl lg:text-[80px] leading-none tracking-[-0.04em] mb-3">
                <span className="text-primary-400">co</span>fianza
              </h1>

              <p className="font-script italic text-2xl sm:text-3xl lg:text-[38px] leading-tight text-white/55 mb-5">
                ¿Te pidieron fiador? <strong className="text-coral-500 not-italic font-normal">Soy yo.</strong>{' '}
                Llámanos.
              </p>

              <p className="text-base text-white/45 leading-relaxed max-w-lg mb-9">
                Evaluamos tu perfil en segundos y firmamos como tu fiador en el contrato de
                arrendamiento. Sin codeudor humano. Sin deberle el favor a nadie.
              </p>

              <div className="flex flex-wrap gap-3 mb-12">
                <a
                  href="#vitrina"
                  className="inline-flex items-center gap-2 px-9 py-4 bg-coral-500 hover:bg-coral-600 text-white text-base font-semibold rounded-2xl shadow-lg shadow-coral-500/30 transition-all hover:-translate-y-px"
                >
                  Encuentra tu inmueble →
                </a>
                <Link
                  href="/registro"
                  className="inline-flex items-center gap-2 px-9 py-4 border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-base font-semibold rounded-2xl transition-colors"
                >
                  Soy propietario / inmobiliaria
                </Link>
              </div>

              <div className="flex flex-wrap gap-5 text-sm text-white/40 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="text-primary-400 font-bold">✓</span> Respuesta en segundos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-primary-400 font-bold">✓</span> Cashback del 30%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-primary-400 font-bold">✓</span> Reporte positivo a centrales
                </span>
              </div>
            </div>

            {/* Mock card */}
            <div className="w-full max-w-sm flex-shrink-0">
              <div className="rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur p-7">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <div className="text-base font-bold text-white">Hola, María</div>
                    <div className="text-xs text-white/35">EXP-2026-0014</div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary-500/15 text-primary-400 text-[11px] font-semibold">
                    Activo
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'Pago del estudio', status: '✓', state: 'done' },
                    { name: 'Estudio crediticio', status: '✓ Aprobado', state: 'done' },
                    { name: 'Contrato generado', status: '✓ Listo', state: 'done' },
                    { name: 'Firma electrónica', status: '→ WhatsApp', state: 'active' },
                  ].map((step) => (
                    <div
                      key={step.name}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl ${
                        step.state === 'done'
                          ? 'bg-primary-500/[0.06] border border-primary-500/10'
                          : 'bg-primary-500/10 border-2 border-primary-500/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full bg-primary-400 ${
                          step.state === 'active' ? 'ring-4 ring-primary-500/20' : ''
                        }`}
                      />
                      <span
                        className={`flex-1 text-sm ${
                          step.state === 'active'
                            ? 'text-white font-semibold'
                            : 'text-white/70'
                        }`}
                      >
                        {step.name}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          step.state === 'active' ? 'text-coral-500' : 'text-primary-400'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3.5 rounded-xl bg-primary-500/[0.06] border border-primary-500/10 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-white/35">Score crediticio</div>
                    <div className="text-lg font-bold text-primary-400">632 · Aprobado</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/35">Firma por</div>
                    <div className="text-sm font-semibold text-white">WhatsApp</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          STATS BAR (overlap con hero)
          ════════════════════════════════════════════════════════════ */}
      <div className="px-5 sm:px-8 -mt-11 relative z-10">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 grid grid-cols-2 md:grid-cols-4">
          {[
            { val: ['100', '%'], lbl: 'Digital' },
            { val: '⚡', lbl: 'Respuesta en segundos' },
            { val: '0', lbl: 'Codeudores' },
            { val: ['30', '%'], lbl: 'Cashback al cumplir', accent: 'orange' as const },
          ].map((s, i) => (
            <div
              key={i}
              className={`px-5 py-7 text-center ${
                i < 3 ? 'md:border-r border-gray-100' : ''
              } ${i === 1 ? 'border-r border-gray-100 md:border-r' : ''} ${
                i === 0 ? 'border-r border-gray-100' : ''
              } ${i === 2 ? 'border-t md:border-t-0 border-gray-100' : ''} ${
                i === 3 ? 'border-t md:border-t-0 border-gray-100' : ''
              }`}
            >
              <div className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                {Array.isArray(s.val) ? (
                  <>
                    {s.val[0]}
                    <span className={s.accent === 'orange' ? 'text-coral-500' : 'text-primary-600'}>
                      {s.val[1]}
                    </span>
                  </>
                ) : (
                  s.val
                )}
              </div>
              <div className="text-xs md:text-sm text-gray-500 mt-1 font-medium">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          PROBLEMA
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-3">
            El problema
          </div>
          <h2 className="font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4">
            Arrendar en Colombia
            <br />
            es incómodo.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            Nadie debería perder un hogar por no tener quién responda por él.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-14">
            {[
              {
                tag: 'Antes',
                title: 'Llamar a alguien para pedirle que responda por ti.',
                body: 'Un familiar, un amigo, alguien que ponga su patrimonio en riesgo por ti. Un favor incómodo que no todos pueden pedir ni todos pueden dar.',
                variant: 'plain',
              },
              {
                tag: 'Con Cofianza',
                title: 'Nosotros respondemos. Tú no le debes el favor a nadie.',
                body: 'Evaluamos tu perfil, firmamos en tu contrato como fiador solidario, y tú te mudas con la dignidad intacta.',
                variant: 'green',
              },
              {
                tag: 'Reporte positivo',
                title: 'Pagando a tiempo construyes tu historial crediticio.',
                body: 'Cofianza reporta tu buen comportamiento a centrales de riesgo. Cada mes que pagas a tiempo mejora tu score y te abre puertas.',
                variant: 'plain',
              },
              {
                tag: 'Cashback',
                title: 'Si cumples, recuperas el 30% de lo que pagaste.',
                body: 'Al terminar tu contrato sin moras, te devolvemos el 30% de las comisiones. No es un gasto — es una inversión.',
                variant: 'orange',
              },
            ].map((c) => (
              <div
                key={c.tag}
                className={`p-9 rounded-3xl border transition-all ${
                  c.variant === 'green'
                    ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
                    : c.variant === 'orange'
                      ? 'bg-coral-500 border-coral-500 text-white hover:bg-coral-600'
                      : 'bg-white border-gray-200 hover:border-primary-600 hover:shadow-xl hover:shadow-primary-600/10'
                }`}
              >
                <div
                  className={`text-[11px] font-bold tracking-[2px] uppercase mb-3.5 ${
                    c.variant === 'plain' ? 'text-gray-500' : 'text-white/50'
                  }`}
                >
                  {c.tag}
                </div>
                <h3
                  className={`text-xl font-extrabold leading-tight mb-2.5 ${
                    c.variant === 'plain' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  {c.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    c.variant === 'plain' ? 'text-gray-500' : 'text-white/70'
                  }`}
                >
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CÓMO FUNCIONA
          ════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="bg-white py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-3">
            Así funciona
          </div>
          <h2 className="font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4">
            En 3 pasos tienes las llaves.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            Sin filas. Sin codeudor. Sin papeleo.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-14">
            {[
              {
                n: '01',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                ),
                title: 'Encuentras el inmueble',
                body: 'En nuestra vitrina o con una inmobiliaria aliada. Le das "me interesa", agendas la visita y si te gusta, inicias tu solicitud.',
              },
              {
                n: '02',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                ),
                title: 'Te evaluamos en segundos',
                body: 'Pagas el estudio de crédito. Lo consultamos en múltiples bases de datos. Si apruebas, firmamos como tu fiador. Sin papeles, sin filas, sin codeudor.',
              },
              {
                n: '03',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
                title: 'Firmamos y te mudas',
                body: 'El link de firma llega por WhatsApp. Contrato en tu celular en minutos. Cofianza firma como fiador. Tú con las llaves en la mano.',
              },
            ].map((c) => (
              <div
                key={c.n}
                className="relative bg-gray-50 hover:bg-white border border-gray-200 hover:border-primary-600 rounded-3xl p-10 transition-all hover:shadow-xl hover:shadow-primary-600/[0.06]"
              >
                <span className="absolute top-5 right-6 text-6xl font-black text-black/[0.03] leading-none">
                  {c.n}
                </span>
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-5">
                  {c.icon}
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">{c.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          COUNTERS
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-primary-600 py-20 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-1">
          {[
            { val: ['100', '%'], lbl: 'Digital — sin papeles ni filas' },
            { val: '⚡', lbl: 'De solicitud a respuesta en segundos' },
            { val: ['30', '%'], lbl: 'Cashback al cumplir' },
            { val: '0', lbl: 'Codeudores necesarios' },
          ].map((c, i) => (
            <div key={i} className="px-5 py-8 text-center">
              <div className="text-5xl font-black text-white tracking-tight">
                {Array.isArray(c.val) ? (
                  <>
                    {c.val[0]}
                    <span className="text-white/40">{c.val[1]}</span>
                  </>
                ) : (
                  c.val
                )}
              </div>
              <div className="text-sm text-white/60 mt-1 font-medium">{c.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          AUDIENCIAS
          ════════════════════════════════════════════════════════════ */}
      <section id="para-quien" className="bg-gray-50 py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-3">
            Para quién es Cofianza
          </div>
          <h2 className="font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4">
            Diseñado para las tres
            <br />
            partes del arriendo.
          </h2>

          <div className="grid md:grid-cols-3 gap-4 mt-14">
            {[
              {
                tag: 'Para arrendatarios',
                title: '¿Buscas dónde vivir?',
                body: '¿Te pidieron fiador? Nosotros firmamos. Paga el estudio y firma desde tu celular.',
                items: [
                  'Sin codeudor ni fiador humano',
                  'Respuesta en segundos',
                  'Firma por WhatsApp',
                  'Cashback del 30% si cumples',
                  'Reporte positivo a centrales de riesgo',
                ],
                cta: 'Encuentra tu inmueble →',
                href: '/vitrina',
                featured: true,
              },
              {
                tag: 'Para propietarios',
                title: '¿Tienes un inmueble?',
                body: 'Publica en nuestra vitrina o recibe arrendatarios respaldados. Tu contrato viene con fiador firmado.',
                items: [
                  'Fiador solidario sin beneficio de excusión',
                  'Pago garantizado desde día 20 de mora',
                  'Proceso de restitución coordinado',
                  'Sin tramitar cobros directamente',
                ],
                cta: 'Registra tu inmueble →',
                href: '/registro',
              },
              {
                tag: 'Para inmobiliarias',
                title: '¿Gestionas cartera?',
                body: 'Usa Cofianza como fiador. Panel de gestión, estudios en lote y gana por cada estudio que gestiones.',
                items: [
                  'Gana por cada estudio que gestiones',
                  'Panel de expedientes en tiempo real',
                  'Cofianza firma en tus contratos',
                  'Protocolo de cobro profesional incluido',
                ],
                cta: 'Aliarme con Cofianza →',
                href: '/registro',
              },
            ].map((a) => (
              <div
                key={a.tag}
                className={`p-9 rounded-3xl border flex flex-col transition-all ${
                  a.featured
                    ? 'bg-ink-900 border-gray-800 shadow-2xl md:scale-[1.03]'
                    : 'bg-white border-gray-200 hover:shadow-xl'
                }`}
              >
                <div
                  className={`text-[11px] font-bold tracking-[2px] uppercase mb-3.5 ${
                    a.featured ? 'text-primary-400' : 'text-gray-500'
                  }`}
                >
                  {a.tag}
                </div>
                <h3 className={`text-2xl font-extrabold mb-2.5 ${a.featured ? 'text-white' : 'text-gray-900'}`}>
                  {a.title}
                </h3>
                <p className={`text-sm leading-relaxed mb-5 ${a.featured ? 'text-white/50' : 'text-gray-500'}`}>
                  {a.body}
                </p>
                <ul className="flex-1 mb-6">
                  {a.items.map((item) => (
                    <li
                      key={item}
                      className={`text-[13px] py-1.5 border-b flex items-start gap-2 ${
                        a.featured
                          ? 'text-white/70 border-white/[0.08]'
                          : 'text-gray-700 border-gray-100'
                      }`}
                    >
                      <span className="text-primary-400 font-bold shrink-0">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={a.href}
                  className={`text-sm font-bold inline-flex items-center gap-1.5 transition-all hover:gap-2.5 mt-auto ${
                    a.featured ? 'text-coral-400' : 'text-primary-600'
                  }`}
                >
                  {a.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          VITRINA PREVIEW — 3 inmuebles destacados (#vitrina).
          Ubicada debajo de "Para quién" (mockup 01_*).
          ════════════════════════════════════════════════════════════ */}
      <VitrinaPreview />

      {/* ════════════════════════════════════════════════════════════
          COMPARACIÓN
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-ink-900 text-white py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-[3px] uppercase text-white/30 mb-3">
            Comparación
          </div>
          <h2 className="font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4 text-white">
            Así de diferente es
            <br />
            arrendar con nosotros.
          </h2>

          <div className="grid md:grid-cols-2 gap-1 mt-14 rounded-3xl overflow-hidden">
            <div className="bg-white/[0.03] p-10">
              <h3 className="text-base font-extrabold text-white/35 mb-6">Método tradicional</h3>
              <ul className="space-y-2">
                {[
                  'Buscar un codeudor y pedirle el favor',
                  'Meses de extractos y certificaciones',
                  '1 a 3 semanas esperando respuesta',
                  'Visitas presenciales a la inmobiliaria',
                  'Firma en papel con múltiples visitas',
                  'El buen comportamiento no cuenta',
                  'Si paga, no recupera nada',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-white/30 py-2 border-b border-white/[0.05]"
                  >
                    <span className="text-red-400 shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-primary-600 p-10">
              <h3 className="text-base font-extrabold text-white mb-6">Con Cofianza</h3>
              <ul className="space-y-2">
                {[
                  'Nosotros firmamos. Sin pedirle a nadie.',
                  'Solo tu cédula y un estudio automático',
                  'Respuesta en segundos',
                  'Todo desde tu celular',
                  'Firma electrónica legal por WhatsApp',
                  'Reporte positivo a centrales de riesgo',
                  'Cashback del 30% al cumplir el contrato',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-white/90 py-2 border-b border-white/15"
                  >
                    <span className="text-primary-300 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FAQ
          ════════════════════════════════════════════════════════════ */}
      <section id="preguntas" className="bg-gray-50 py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-3">
            Preguntas frecuentes
          </div>
          <h2 className="font-black text-4xl sm:text-5xl tracking-tight leading-tight mb-4">
            Todo lo que quieres saber.
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mt-14">
            {[
              {
                q: '¿Qué significa que Cofianza sea mi fiador?',
                a: 'Cofianza firma en tu contrato de arrendamiento como fiador solidario — igual que antes lo hacía un familiar o amigo. La diferencia es que detrás de Cofianza hay un respaldo profesional y una promesa que siempre se cumple. Tú no le debes el favor a nadie.',
              },
              {
                q: '¿Cuánto cuesta y qué incluye?',
                a: 'El estudio crediticio tiene un costo único al inicio. Si apruebas, pagas una prima de vinculación equivalente al 10% de un canon y luego una comisión mensual. Al terminar sin moras, recuperas el 30% de las comisiones pagadas.',
              },
              {
                q: '¿Qué pasa si no me aprueban?',
                a: 'Si tu perfil necesita un respaldo adicional, puedes aplicar con un co-titular — puede ser tu pareja, un familiar o alguien que vaya a vivir contigo. Si en este momento no es posible, puedes volver a aplicar cuando tu situación financiera mejore.',
              },
              {
                q: '¿Cómo funciona el cashback del 30%?',
                a: 'Al terminar tu contrato sin moras y con el inmueble en buen estado, te devolvemos el 30% de todas las comisiones mensuales pagadas. Es nuestra manera de reconocer a los buenos arrendatarios.',
              },
              {
                q: '¿Necesito registrarme para ver inmuebles?',
                a: 'No. La vitrina es pública. Puedes explorar todos los inmuebles disponibles sin crear cuenta. Cuando encuentres uno que te guste, solo dejas tu nombre y celular para que el propietario o inmobiliaria te contacte y agendes la visita.',
              },
              {
                q: '¿Qué pasa si me atraso en el pago?',
                a: 'Desde el día 6 de mora Cofianza activa su protocolo de cobro. El día 9 te notificamos formalmente que en 20 días reportaremos a centrales de riesgo. El día 20 pagamos al propietario y el cobro es directamente contra ti.',
              },
            ].map((f) => (
              <div
                key={f.q}
                className="bg-white p-7 sm:p-8 rounded-2xl border border-gray-200"
              >
                <h3 className="text-base font-extrabold mb-2.5">{f.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA FINAL
          ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-ink-900 text-white py-32 px-5 sm:px-8 text-center">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/[0.12] blur-3xl rounded-full pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <h2 className="font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight mb-4 text-white">
            ¿Te pidieron fiador?
            <br />
            <span className="text-coral-500">Soy yo.</span> Llámanos.
          </h2>
          <p className="text-lg text-white/45 mb-10">
            <strong className="text-white">Sin codeudor humano. Sin deberle el favor a nadie.</strong>{' '}
            Tu fiador profesional en segundos.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/vitrina"
              className="inline-flex items-center gap-2 px-9 py-4 bg-coral-500 hover:bg-coral-600 text-white text-base font-semibold rounded-2xl shadow-lg shadow-coral-500/30 transition-all hover:-translate-y-px"
            >
              Encuentra tu inmueble →
            </Link>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 px-9 py-4 border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-base font-semibold rounded-2xl transition-colors"
            >
              Soy propietario / inmobiliaria →
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
