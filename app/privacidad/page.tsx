/**
 * Politica de Privacidad — pagina publica linkada desde el registro
 * (form del solicitante: checkbox "Autorizo el tratamiento de mis datos
 * personales conforme a la politica de privacidad (Ley 1581/2012)").
 *
 * Contenido placeholder alineado con la Ley 1581 de 2012 + Decreto 1377
 * de 2013 (proteccion de datos personales en Colombia). El equipo legal
 * del cliente reemplazara el texto con la version final.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Cofianza',
  description: 'Política de tratamiento de datos personales de Cofianza, conforme a la Ley 1581 de 2012 de Colombia.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad y Tratamiento de Datos</h1>
          <p className="text-sm text-gray-500 mt-2">Última actualización: mayo de 2026 · Conforme a la Ley 1581 de 2012</p>
        </header>

        <article className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Responsable del tratamiento</h2>
            <p>
              <strong>CONSTRUCTORA Y ARRENDAMIENTOS DE ANTIOQUIA S.A.S.</strong>, operadora de la plataforma Cofianza, es el responsable del tratamiento de los datos personales recabados a través de este sitio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Datos que recolectamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Datos de identificación (nombre, apellido, tipo y número de documento).</li>
              <li>Datos de contacto (correo, teléfono, dirección).</li>
              <li>Datos socioeconómicos relevantes para el estudio crediticio (ingresos, ocupación, etc.).</li>
              <li>Datos del inmueble y del contrato (en caso de propietarios o inmobiliarias).</li>
              <li>Datos de pagos (a través de Stripe — Cofianza no almacena información completa de tarjetas).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Finalidad</h2>
            <p>Los datos se tratan para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gestionar el proceso de arrendamiento (publicación, visitas, contrato, firma, pagos).</li>
              <li>Realizar estudios crediticios a través de proveedores autorizados (TransUnion, etc.).</li>
              <li>Emitir facturación electrónica DIAN.</li>
              <li>Cumplir obligaciones legales y contractuales.</li>
              <li>Comunicaciones operativas (correo, WhatsApp y notificaciones in-app).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Transferencia a terceros</h2>
            <p>
              Tus datos podrán ser compartidos con: Auco.ai (firma electrónica), Factus (facturación DIAN), TransUnion (estudio crediticio), Stripe (procesamiento de pagos), Resend (envío de correos transaccionales) y Supabase (almacenamiento). Todos estos terceros operan bajo acuerdos de confidencialidad y cumplen estándares de protección de datos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Derechos del titular (habeas data)</h2>
            <p>Como titular de los datos, tienes derecho a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conocer, actualizar y rectificar tus datos.</li>
              <li>Solicitar copia de la autorización otorgada.</li>
              <li>Ser informado sobre el uso de tus datos.</li>
              <li>Revocar la autorización y/o solicitar la supresión cuando proceda.</li>
              <li>Acceder gratuitamente a los datos tratados.</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, escribe a soporte de Cofianza.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Conservación</h2>
            <p>
              Los datos se conservan mientras exista una relación contractual con Cofianza y por los plazos exigidos por la legislación colombiana en materia tributaria, comercial y de protección al consumidor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y administrativas razonables para proteger tus datos: cifrado en tránsito (HTTPS), control de acceso por roles, almacenamiento en infraestructura con certificaciones de seguridad reconocidas y auditoría de accesos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Cookies</h2>
            <p>
              La Plataforma utiliza cookies técnicas estrictamente necesarias para la sesión del usuario. No utilizamos cookies de seguimiento publicitario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Cambios a esta política</h2>
            <p>
              Cualquier cambio sustancial será notificado a través de la Plataforma. La fecha de última actualización aparece al inicio de este documento.
            </p>
          </section>

          <p className="mt-8">
            Ver también: <Link href="/terminos" className="text-primary-600 underline">Términos y Condiciones</Link>.
          </p>

          <p className="text-xs text-gray-500 mt-4 italic">
            Documento en revisión por el equipo legal. La versión definitiva podrá ampliarse.
          </p>
        </article>
      </main>

      <PublicFooter />
    </div>
  )
}
