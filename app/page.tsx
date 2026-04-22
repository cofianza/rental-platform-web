/**
 * Landing Cofianza — reenfoque "afianzadora digital"
 *
 * Narrativa: hero impactante → problema → solución (valor props) → cómo
 * funciona → comparación vs método tradicional → para quién → social proof →
 * vitrina (secundaria) → FAQ → CTA final.
 *
 * Diseño: gradiente teal/dark, cards flotantes con glassmorphism, grid
 * pattern overlay, tipografía con jerarquía dramática, pocas animaciones
 * estratégicas (pulse, hover transitions, entry fades via Tailwind).
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PropertyGrid } from '@/components/vitrina/PropertyGrid'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'

export const metadata: Metadata = {
  title: 'Cofianza — Arriendas sin codeudor, 100% digital',
  description: 'Afianzadora digital en Colombia. Respaldamos tu contrato de arrendamiento para que no tengas que buscar codeudor ni pasar por procesos largos.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ════════════════════════════════════════════════════════════
          HERO — Dark gradient + floating status cards
          ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Columna izquierda: copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-400/20 mb-6 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400" />
                </span>
                <span className="text-xs sm:text-sm text-primary-300 font-medium">Afianzadora digital · Colombia</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight">
                Arriendas{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-primary-300 to-cyan-300 bg-clip-text text-transparent">
                    sin codeudor
                  </span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full text-primary-500/40"
                    viewBox="0 0 200 8"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M0 6 Q 50 0, 100 4 T 200 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
                .
                <br />
                <span className="text-gray-100">Nosotros somos tu fiador.</span>
              </h1>

              <p className="text-base sm:text-lg text-gray-300 max-w-xl mb-8 leading-relaxed">
                Cofianza respalda tu contrato de arrendamiento como afianzadora. Evalúamos tu perfil, firmamos como fiador y tú te mudas sin pedirle a nadie más. Todo desde tu celular.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/registro"
                  className="group inline-flex items-center gap-2 px-6 py-3.5 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-400/30 hover:-translate-y-0.5"
                >
                  Iniciar mi solicitud
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="#como-funciona"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors border border-white/15 backdrop-blur-sm"
                >
                  Ver cómo funciona
                </Link>
              </div>

              {/* Micro-stats inline */}
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <HeroMicroStat value="100%" label="Digital" />
                <HeroMicroStat value="24h" label="Respuesta" />
                <HeroMicroStat value="Sin" label="Codeudor" accent />
                <HeroMicroStat value="TransUnion" label="Buró aliado" />
              </div>
            </div>

            {/* Columna derecha: floating cards mockup */}
            <div className="relative hidden lg:block">
              <FloatingHeroMock />
            </div>
          </div>
        </div>

        {/* Logos/badges de trust — borde inferior del hero */}
        <div className="relative border-t border-white/5 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-gray-400">
              <TrustBadge icon="shield" label="Respaldo como fiador" />
              <TrustBadge icon="chart" label="Estudio con TransUnion" />
              <TrustBadge icon="card" label="Pagos seguros con Stripe" />
              <TrustBadge icon="pen" label="Firma electrónica legal (Auco)" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PROBLEMA / SOLUCIÓN — Tensión narrativa corta
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold text-red-500 tracking-wider uppercase">El problema</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 mb-5 leading-tight">
                Arrendar en Colombia es complicado.
              </h2>
              <ul className="space-y-3 text-gray-600">
                <ProblemItem>Pedirle a un familiar que sea tu codeudor.</ProblemItem>
                <ProblemItem>Llevar meses de extractos bancarios y certificaciones.</ProblemItem>
                <ProblemItem>Semanas esperando una respuesta de la inmobiliaria.</ProblemItem>
                <ProblemItem>Firmar papeles a mano en múltiples visitas.</ProblemItem>
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-cyan-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-8 md:p-10 shadow-xl shadow-primary-500/5">
                <span className="text-xs font-semibold text-primary-600 tracking-wider uppercase">La solución</span>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3 mb-4 leading-tight">
                  Nosotros somos tu fiador.
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Cofianza es una afianzadora digital. Evaluamos tu perfil crediticio en minutos y si te aprobamos, firmamos como tu fiador en el contrato. No necesitas codeudor, ni filas, ni papeleo.
                </p>
                <Link
                  href="/registro"
                  className="inline-flex items-center gap-1.5 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                >
                  Empieza tu proceso →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          VALUE PROPS — 4 cards con icono
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-wider uppercase">Por qué Cofianza</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 leading-tight">
              Tu proceso, simplificado de principio a fin.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <ValueCard
              title="Sin codeudor"
              description="Nosotros firmamos como tu fiador. Evitá pedirle el favor a tus papás, tíos o amigos."
              iconPath="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            />
            <ValueCard
              title="Respuesta en minutos"
              description="Estudio crediticio con TransUnion en tiempo real. Sabés si califica mientras tomas café."
              iconPath="M13 10V3L4 14h7v7l9-11h-7z"
            />
            <ValueCard
              title="Firma por WhatsApp"
              description="El link del contrato llega a tu celular. Firma desde donde estés — 96% de completion vs email."
              iconPath="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
            <ValueCard
              title="Todo en un lugar"
              description="Pago, estudio, contrato y firma en un solo panel. Sin cadenas interminables de correos."
              iconPath="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CÓMO FUNCIONA — Timeline con línea conectora
          ════════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-primary-600 tracking-wider uppercase">Así funciona</span>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mt-3 leading-tight">
              En 3 pasos tienes las llaves.
            </h2>
            <p className="text-gray-500 mt-4 text-lg">
              Sin filas. Sin codeudor. Sin papeleo.
            </p>
          </div>

          <div className="relative">
            {/* Línea conectora horizontal (solo desktop) */}
            <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent" aria-hidden="true" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 relative">
              <StepCard
                number="01"
                title="Encuentras el inmueble"
                description="En nuestra vitrina o con una inmobiliaria aliada. Le das “Me interesa”, agendas la visita y el propietario la confirma."
                iconPath="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <StepCard
                number="02"
                title="Te evaluamos"
                description="Pagas el estudio crediticio, consultamos TransUnion en minutos, y si pasas la evaluación firmamos como tu fiador."
                iconPath="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
              <StepCard
                number="03"
                title="Firmas y te mudas"
                description="Link de firma por WhatsApp y email. Contrato en tu mano en minutos — y tú con las llaves en la otra."
                iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          COMPARACIÓN — Tradicional vs Cofianza
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-primary-400 tracking-wider uppercase">Comparación</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-3 leading-tight">
              Así de diferente es arrendar con nosotros.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ComparisonCard
              kind="bad"
              title="Método tradicional"
              items={[
                'Buscar un codeudor de confianza',
                '3–5 certificaciones laborales + extractos',
                '1 a 3 semanas de espera',
                'Visitas presenciales a la inmobiliaria',
                'Firma en papel con notaría',
                'Pagos por consignación manual',
              ]}
            />
            <ComparisonCard
              kind="good"
              title="Con Cofianza"
              items={[
                'Nosotros firmamos como tu fiador',
                'Solo tu cédula y un estudio automático',
                'Respuesta en menos de 24 horas',
                'Todo desde tu celular',
                'Firma electrónica por WhatsApp',
                'Pasarela Stripe — paga con tarjeta',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          AUDIENCIAS — Para ti, propietario, inmobiliaria
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-wider uppercase">Para quién es Cofianza</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 leading-tight">
              Diseñado para los tres lados del arriendo.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <AudienceCard
              tag="Para arrendatarios"
              title="¿Buscas dónde vivir?"
              description="Evita pedir codeudor. Solicita tu fianza, paga el estudio, y recibe el contrato para firmar desde tu celular."
              ctaLabel="Iniciar solicitud"
              ctaHref="/registro"
              tone="primary"
            />
            <AudienceCard
              tag="Para propietarios"
              title="¿Tienes un inmueble?"
              description="Publícalo en nuestra vitrina o recibe solicitantes respaldados por nosotros. El contrato viene garantizado."
              ctaLabel="Registra tu inmueble"
              ctaHref="/registro"
              tone="neutral"
            />
            <AudienceCard
              tag="Para inmobiliarias"
              title="¿Gestionas cartera?"
              description="Usa Cofianza como fiador para tus clientes. Compra paquetes de estudios y gestiona todo desde un solo panel."
              ctaLabel="Aliarme con Cofianza"
              ctaHref="/registro"
              tone="neutral"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          VITRINA — Secundaria, enmarcada como complemento
          ════════════════════════════════════════════════════════════ */}
      <section id="vitrina" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Vitrina</span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                ¿Aún no tienes inmueble?
              </h2>
              <p className="text-gray-500 mt-1 max-w-xl">
                Estos son los publicados por propietarios e inmobiliarias aliadas. Todos pueden arrendarse con nuestro respaldo.
              </p>
            </div>
            <Link
              href="/registro"
              className="self-start md:self-auto text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              O salta directo a solicitar tu fianza →
            </Link>
          </div>
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-48 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          }>
            <PropertyGrid />
          </Suspense>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FAQ — Preguntas frecuentes
          ════════════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary-600 tracking-wider uppercase">Preguntas frecuentes</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 leading-tight">
              Todo lo que quieres saber.
            </h2>
          </div>

          <div className="space-y-3">
            <FaqItem
              question="¿Qué significa que Cofianza sea mi fiador?"
              answer="Cuando firmamos el contrato como fiadores, respondemos por ti ante el propietario si por alguna razón no puedes cumplir con el pago del arriendo. Así el propietario se queda tranquilo y tú no necesitas pedirle el favor a nadie más."
            />
            <FaqItem
              question="¿Cuánto cuesta el estudio crediticio?"
              answer="El valor del estudio se cobra una sola vez cuando inicias tu solicitud. Lo pagas con tarjeta a través de Stripe. Si eres cliente de una inmobiliaria aliada, en algunos casos la inmobiliaria puede asumir el costo."
            />
            <FaqItem
              question="¿Qué pasa si me aprueban el estudio?"
              answer="Te habilitamos la generación del contrato. El propietario o la inmobiliaria lo preparan, te llega un enlace por WhatsApp y correo para firmar electrónicamente desde tu celular, y listo: tú tienes contrato y el propietario tiene su fiador."
            />
            <FaqItem
              question="¿Cuánto tarda todo el proceso?"
              answer="Desde que inicias la solicitud hasta que tienes contrato firmado, el proceso normalmente toma 24–72 horas. La mayor parte del tiempo depende de la coordinación de la visita al inmueble con el propietario."
            />
            <FaqItem
              question="¿Tengo que estar en una ciudad específica?"
              answer="Operamos en toda Colombia. Tanto los solicitantes como los propietarios y las inmobiliarias pueden estar en cualquier ciudad — el proceso es 100% digital."
            />
            <FaqItem
              question="¿Qué pasa al final del contrato?"
              answer="Unos días antes del vencimiento te avisamos si quieres renovar. La renovación se hace sin volver a pagar estudio, siempre que hayas cumplido con los pagos durante el período anterior."
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA FINAL — Gran cierre
          ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-cyan-800">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(135deg, transparent 45%, white 50%, transparent 55%)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-300/20 rounded-full blur-[100px]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Arriendas hoy,{' '}
            <span className="text-cyan-200">sin codeudor.</span>
          </h2>
          <p className="text-white/80 mb-10 max-w-2xl mx-auto text-lg">
            Crea tu cuenta en Cofianza y empezá tu proceso. Si eres propietario o inmobiliaria, también puedes registrarte para recibir arrendatarios respaldados.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/registro"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-xl hover:-translate-y-0.5"
            >
              Iniciar mi solicitud
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/30 backdrop-blur-sm"
            >
              Soy propietario / inmobiliaria
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Sub-componentes
// ═══════════════════════════════════════════════════════════════════

function HeroMicroStat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-2xl sm:text-3xl font-bold ${accent ? 'text-primary-300' : 'text-white'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function FloatingHeroMock() {
  return (
    <div className="relative w-full aspect-[4/5] max-h-[560px]">
      {/* Glow detrás */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-cyan-500/20 rounded-3xl blur-3xl" />

      {/* Card principal: simulación de dashboard */}
      <div className="absolute inset-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-primary-500/10">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-3 h-3 rounded-full bg-red-400/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
          <div className="w-3 h-3 rounded-full bg-green-400/70" />
          <span className="ml-2 text-[10px] text-white/40 font-mono">cofianza.co/dashboard</span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-cyan-400 flex items-center justify-center font-bold">
              M
            </div>
            <div>
              <p className="text-sm font-semibold">Hola, María</p>
              <p className="text-xs text-white/50">Expediente EXP-2026-0014</p>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <MockStep label="Estudio crediticio" value="Aprobado" check tone="green" />
          <MockStep label="Pago del estudio" value="Confirmado" check tone="green" />
          <MockStep label="Contrato" value="Listo para firmar" check tone="primary" />
          <MockStep label="Firma electrónica" value="Pendiente" tone="muted" />
        </div>
      </div>

      {/* Badge flotante superior derecha */}
      <div className="absolute -top-3 -right-3 bg-green-500/90 backdrop-blur-sm text-white rounded-2xl px-4 py-3 shadow-2xl shadow-green-500/30 rotate-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-80">Score TransUnion</p>
            <p className="text-lg font-bold leading-none">632 · Aprobado</p>
          </div>
        </div>
      </div>

      {/* Badge flotante inferior izquierda — WhatsApp */}
      <div className="absolute -bottom-4 -left-4 bg-white text-gray-900 rounded-2xl px-4 py-3 shadow-2xl -rotate-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Firma</p>
            <p className="text-sm font-bold leading-none">Link por WhatsApp</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockStep({ label, value, check, tone }: {
  label: string; value: string; check?: boolean; tone: 'green' | 'primary' | 'muted'
}) {
  const toneClasses = {
    green: { badge: 'bg-green-500/15 text-green-300 border-green-500/20', icon: 'text-green-400' },
    primary: { badge: 'bg-primary-500/15 text-primary-300 border-primary-500/20', icon: 'text-primary-400' },
    muted: { badge: 'bg-white/5 text-white/50 border-white/10', icon: 'text-white/30' },
  }[tone]

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${toneClasses.badge}`}>
          {check ? (
            <svg className={`w-3 h-3 ${toneClasses.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${toneClasses.icon.replace('text-', 'bg-')}`} />
          )}
        </div>
        <span className="text-sm text-white/80">{label}</span>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${toneClasses.badge}`}>{value}</span>
    </div>
  )
}

function TrustBadge({ icon, label }: { icon: 'shield' | 'chart' | 'card' | 'pen'; label: string }) {
  const paths: Record<typeof icon, string> = {
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    pen: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  }
  return (
    <span className="flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-400">
        <path strokeLinecap="round" strokeLinejoin="round" d={paths[icon]} />
      </svg>
      {label}
    </span>
  )
}

function ProblemItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <span>{children}</span>
    </li>
  )
}

function ValueCard({ title, description, iconPath }: { title: string; description: string; iconPath: string }) {
  return (
    <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 transition-all">
      <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
        <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description, iconPath }: { number: string; title: string; description: string; iconPath: string }) {
  return (
    <div className="relative">
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 mx-auto md:mx-0 mb-5">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
        <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
          {number}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

function ComparisonCard({ kind, title, items }: { kind: 'bad' | 'good'; title: string; items: string[] }) {
  const isGood = kind === 'good'
  return (
    <div
      className={
        isGood
          ? 'bg-gradient-to-br from-primary-500/20 to-cyan-500/10 border border-primary-400/30 rounded-2xl p-8 backdrop-blur-sm'
          : 'bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm'
      }
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className={
            isGood
              ? 'w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white shrink-0'
              : 'w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0'
          }
        >
          {isGood ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h3 className={isGood ? 'text-xl font-bold text-white' : 'text-xl font-bold text-white/70'}>{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm">
            <span className={isGood ? 'text-primary-300 mt-0.5' : 'text-red-400 mt-0.5'}>{isGood ? '✓' : '✗'}</span>
            <span className={isGood ? 'text-white' : 'text-white/60'}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AudienceCard({ tag, title, description, ctaLabel, ctaHref, tone }: {
  tag: string; title: string; description: string; ctaLabel: string; ctaHref: string; tone: 'primary' | 'neutral'
}) {
  const isPrimary = tone === 'primary'
  return (
    <div
      className={
        isPrimary
          ? 'relative bg-gradient-to-br from-primary-600 to-cyan-700 text-white rounded-2xl p-7 shadow-xl shadow-primary-500/10 overflow-hidden'
          : 'relative bg-white text-gray-900 rounded-2xl p-7 border border-gray-200 hover:border-primary-200 hover:shadow-lg transition-all'
      }
    >
      {isPrimary && (
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(135deg, transparent 45%, white 50%, transparent 55%)',
          backgroundSize: '30px 30px',
        }} />
      )}
      <div className="relative">
        <span className={isPrimary ? 'text-xs font-semibold uppercase tracking-wider text-white/80' : 'text-xs font-semibold uppercase tracking-wider text-primary-600'}>{tag}</span>
        <h3 className={isPrimary ? 'text-2xl font-bold mt-2 mb-3' : 'text-2xl font-bold mt-2 mb-3'}>{title}</h3>
        <p className={isPrimary ? 'text-white/85 mb-5 leading-relaxed' : 'text-gray-500 mb-5 leading-relaxed'}>{description}</p>
        <Link
          href={ctaHref}
          className={
            isPrimary
              ? 'inline-flex items-center gap-1.5 px-4 py-2 bg-white text-primary-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors'
              : 'inline-flex items-center gap-1.5 text-primary-600 font-semibold text-sm hover:text-primary-700 transition-colors'
          }
        >
          {ctaLabel} →
        </Link>
      </div>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl transition-colors">
      <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
        <h3 className="font-semibold text-gray-900 text-base">{question}</h3>
        <svg className="w-5 h-5 text-gray-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-5 pb-5 text-gray-600 leading-relaxed">{answer}</div>
    </details>
  )
}
