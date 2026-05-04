/**
 * Terminos y Condiciones — pagina publica linkada desde el registro
 * (form del solicitante: checkbox "Acepto los terminos y condiciones").
 *
 * Contenido placeholder con la estructura tipica colombiana. El equipo
 * legal del cliente revisara y reemplazara el texto con la version final
 * antes de produccion. Mantener la URL /terminos para no romper el link
 * del checkbox en el form del registro.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Cofianza',
  description: 'Términos y condiciones de uso de la plataforma Cofianza para arrendamiento de inmuebles en Colombia.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Términos y Condiciones</h1>
          <p className="text-sm text-gray-500 mt-2">Última actualización: mayo de 2026</p>
        </header>

        <article className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Aceptación</h2>
            <p>
              Al registrarte y utilizar la plataforma Cofianza (en adelante, &ldquo;la Plataforma&rdquo;), operada por <strong>CONSTRUCTORA Y ARRENDAMIENTOS DE ANTIOQUIA S.A.S.</strong>, aceptas estos Términos y Condiciones. Si no estás de acuerdo con alguno de los términos, no podrás usar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Servicio</h2>
            <p>
              Cofianza facilita la conexión entre propietarios o inmobiliarias y arrendatarios para procesos de arrendamiento de inmuebles en Colombia, incluyendo: publicación de propiedades, agendamiento de visitas, estudios crediticios a través de proveedores autorizados (TransUnion u otros), generación de contratos y firma electrónica vía Auco.ai.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Registro y cuenta</h2>
            <p>
              El usuario es responsable de la exactitud de los datos suministrados al registrarse y de mantener la confidencialidad de su contraseña. Cofianza puede suspender cuentas que incumplan estos términos o presenten actividad sospechosa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Pagos y tarifas</h2>
            <p>
              Los costos del estudio crediticio, certificado de firma electrónica y otros servicios asociados se informan al usuario antes de cada cobro. Los pagos se procesan a través de Stripe y la facturación electrónica DIAN se emite vía Factus.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Datos personales</h2>
            <p>
              El tratamiento de datos personales se rige por la <Link href="/privacidad" className="text-primary-600 underline">Política de Privacidad</Link>, en cumplimiento de la Ley 1581 de 2012 y demás normas aplicables en Colombia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Limitación de responsabilidad</h2>
            <p>
              Cofianza actúa como facilitador tecnológico. No es parte directa del contrato de arrendamiento entre propietario y arrendatario. La validez jurídica del contrato firmado mediante Auco.ai se rige por la Ley 527 de 1999 (mensajes de datos y firma electrónica).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Modificaciones</h2>
            <p>
              Cofianza se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados a través de la Plataforma con al menos 15 días de anticipación cuando sean sustanciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Contacto</h2>
            <p>
              Para preguntas sobre estos Términos, escribe a soporte de Cofianza.
            </p>
          </section>

          <p className="text-xs text-gray-500 mt-8 italic">
            Documento en revisión por el equipo legal. La versión definitiva podrá ampliarse.
          </p>
        </article>
      </main>

      <PublicFooter />
    </div>
  )
}
