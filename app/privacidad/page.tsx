/**
 * Política de Tratamiento de Datos Personales — versión oficial v1.0
 * entregada por el equipo legal de COFIANZA S.A.S. Página pública linkada
 * desde el checkbox "Autorizo el tratamiento de mis datos personales..."
 * en el form de registro del solicitante. Conforme a Ley 1581/2012 y
 * Decreto 1377/2013 (Colombia).
 *
 * Datos de identificación (NIT y dirección) confirmados por el cliente el
 * 09-jul-2026 con la versión oficial v1.0 del documento legal.
 *
 * v1.3 (24-nov-2026): nueva sección 6, mensajes por WhatsApp (Meta pide que
 * la política de la app de WhatsApp Business lo explique). Describe lo que
 * hace la API (plantillas de aviso, estados del webhook) y la firma por Auco.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'

export const metadata: Metadata = {
  title: 'Política de Tratamiento de Datos Personales — Cofianza',
  description:
    'Política de tratamiento de datos personales de Cofianza S.A.S., conforme a la Ley 1581 de 2012 y Decreto 1377 de 2013 de Colombia.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Política de Tratamiento de Datos Personales</h1>
          <p className="text-base text-gray-700 mt-1">COFIANZA S.A.S.</p>
          <p className="text-sm text-gray-500 mt-2">Versión 1.3 · Actualizada el 24 de noviembre de 2026 · Conforme a la Ley 1581 de 2012 y Decreto 1377 de 2013</p>
        </header>

        <article className="prose prose-sm max-w-none text-gray-700 space-y-7 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Responsable del tratamiento</h2>
            <ul className="list-none pl-0 space-y-1">
              <li><strong>COFIANZA S.A.S.</strong></li>
              <li>NIT: 902.038.122-7</li>
              <li>Correo: <a href="mailto:hola@cofianza.co" className="text-primary-600 underline">hola@cofianza.co</a></li>
              <li>Dirección: Calle 75ab sur 52d 336</li>
            </ul>
            <p className="mt-3">
              COFIANZA S.A.S. actúa como responsable del tratamiento de datos personales en el desarrollo de sus actividades de evaluación de riesgo, estructuración y gestión de soluciones financieras, tecnológicas y servicios asociados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Alcance</h2>
            <p>
              La presente política aplica al tratamiento de datos personales recolectados por COFIANZA a través de canales físicos, digitales, telefónicos o electrónicos, así como a su almacenamiento, uso, circulación, transferencia, transmisión, análisis o cualquier otra forma de tratamiento, en Colombia o en el exterior.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Datos que tratamos</h2>
            <p>COFIANZA podrá tratar, entre otros:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Datos de identificación y contacto.</li>
              <li>Información laboral, económica y patrimonial.</li>
              <li>Información financiera, comercial y crediticia.</li>
              <li>Historial de pagos y comportamiento de obligaciones.</li>
              <li>Información de interacción digital, navegación o dispositivos.</li>
              <li>Número de celular y estado de los mensajes de WhatsApp que se le envían (ver sección 6).</li>
              <li>Datos biométricos o de validación de identidad, cuando sea necesario.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Finalidades del tratamiento</h2>
            <p>Los datos personales serán utilizados para:</p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">Operación y prestación del servicio</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Evaluar el perfil de riesgo, comportamiento y capacidad de pago.</li>
              <li>Analizar, aprobar o rechazar solicitudes de productos o servicios.</li>
              <li>Administrar relaciones contractuales y obligaciones derivadas.</li>
              <li>Realizar procesos de facturación, recaudo y gestión de cartera.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">Información financiera</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Consultar, verificar, reportar y actualizar información ante operadores de información como Datacrédito y TransUnion.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">Gestión de riesgos</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prevenir fraude, suplantación de identidad, lavado de activos y otros riesgos financieros u operativos.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">Gestión comercial y analítica</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Realizar análisis estadísticos, segmentación y perfilamiento.</li>
              <li>Desarrollar modelos de riesgo, comportamiento y analítica de datos.</li>
              <li>Diseñar, estructurar y ofrecer productos o servicios propios.</li>
              <li>Enviar información comercial, promociones y ofertas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Circulación, transferencia y uso comercial de la información</h2>
            <p>
              El titular autoriza a COFIANZA S.A.S. para compartir, transferir, transmitir, ceder o poner a disposición sus datos personales, de manera parcial o total, con:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Aliados comerciales y estratégicos.</li>
              <li>Proveedores tecnológicos o de analítica.</li>
              <li>Entidades financieras o del sector real.</li>
              <li>Empresas interesadas en la estructuración, comercialización u operación de productos o servicios.</li>
              <li>Inversionistas, compradores potenciales de activos, unidades de negocio o portafolios de clientes.</li>
              <li>Terceros con quienes se desarrollen modelos de negocio basados en información, analítica, segmentación o perfilamiento.</li>
            </ul>
            <p className="mt-3">Esta circulación podrá realizarse en Colombia o en el exterior, para fines:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Operativos.</li>
              <li>Comerciales.</li>
              <li>Estadísticos o analíticos.</li>
              <li>Estratégicos o de estructuración de negocios.</li>
            </ul>
            <p className="mt-3">
              COFIANZA podrá utilizar la información para generar valor económico mediante modelos de analítica, segmentación, estructuración de portafolios o desarrollo de negocios basados en datos, siempre dentro del marco de la autorización otorgada por el titular y la normativa vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Mensajes por WhatsApp</h2>
            <p>
              COFIANZA envía mensajes por WhatsApp mediante la WhatsApp Business Platform de Meta Platforms, Inc. y sus filiales, incluida WhatsApp LLC («Meta»), al número de celular que suministró el titular o quien lo registró en la plataforma (por ejemplo, la inmobiliaria o el propietario que solicita el estudio). Este canal se usa únicamente para avisos relacionados con el servicio, y no para publicidad:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Enlaces y códigos de verificación para autorizar el tratamiento de datos y firmar electrónicamente esa autorización.</li>
              <li>Enlaces para pagar el estudio y confirmación de otros pagos recibidos (por ejemplo, depósito o primer canon).</li>
              <li>Avisos sobre el avance y el resultado del estudio, incluida la invitación a un coarrendatario o segundo firmante.</li>
              <li>Citas para visitar inmuebles: solicitud, confirmación, reprogramación y cancelación.</li>
              <li>Avisos a propietarios e inmobiliarias sobre las personas interesadas en sus inmuebles, con el nombre, el celular, el correo y el mensaje que esa persona dejó, y sobre los estudios que gestionan.</li>
              <li>Recordatorios de cánones de arrendamiento vencidos (mora) y avisos sobre su cobro.</li>
            </ul>
            <p className="mt-3">
              Para entregar cada mensaje, Meta recibe el número de celular del destinatario y el contenido del mensaje, que puede incluir datos del destinatario y de otras personas del mismo trámite: nombres, la dirección del inmueble, la fecha de una cita, el valor de un canon vencido, el canon aprobado en un estudio, los datos de contacto que dejó una persona interesada en un inmueble o un enlace. Meta actúa como encargado del tratamiento por cuenta de COFIANZA y puede tratar esta información en servidores ubicados fuera de Colombia. El uso que el titular haga de WhatsApp se rige, además, por las condiciones y la política de privacidad de WhatsApp.
            </p>
            <p className="mt-3">
              Además, para la firma electrónica del contrato de arrendamiento, el proveedor de firma electrónica de COFIANZA envía por WhatsApp, desde su propia línea, el enlace para firmar y el código de verificación al celular de cada firmante, y actúa como encargado del tratamiento por cuenta de COFIANZA.
            </p>
            <p className="mt-3">
              De los avisos que Meta le envía, COFIANZA solo usa y guarda el estado de cada mensaje (enviado, entregado, leído o fallido, con el código de error si falló), para confirmar que el aviso llegó y para que el equipo de COFIANZA sepa cuándo no se entregó. El número desde el que se envían estos avisos no recibe respuestas: lo que se escriba a ese número no se lee ni se guarda. Para consultas, el titular puede escribir a <a href="mailto:hola@cofianza.co" className="text-primary-600 underline">hola@cofianza.co</a> o al WhatsApp de atención publicado en www.cofianza.co; lo que escriba por ese canal lo atiende el equipo de COFIANZA y se trata conforme a esta política.
            </p>
            <p className="mt-3">
              El titular puede pedir en cualquier momento que no se le envíen avisos por WhatsApp escribiendo a <a href="mailto:hola@cofianza.co" className="text-primary-600 underline">hola@cofianza.co</a>. Los avisos que también se envían por correo electrónico o se muestran en la plataforma le seguirán llegando por esos medios. Algunos avisos y pasos solo se hacen por WhatsApp, como los recordatorios de cánones vencidos y la firma electrónica del contrato de arrendamiento; en ese caso, COFIANZA le indicará en su respuesta cómo continuar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Datos sensibles</h2>
            <p>
              Cuando se recolecten datos sensibles (por ejemplo, biométricos o de autenticación), su suministro será facultativo y su tratamiento se realizará únicamente para las finalidades informadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Derechos del titular</h2>
            <p>El titular tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Conocer, actualizar y rectificar sus datos personales.</li>
              <li>Solicitar prueba de la autorización otorgada.</li>
              <li>Revocar la autorización cuando sea procedente.</li>
              <li>Solicitar la supresión de sus datos.</li>
              <li>Presentar consultas o reclamos sobre el tratamiento de su información.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
            </ul>
            <p className="mt-3">
              <strong>Canal de atención:</strong> Correo <a href="mailto:hola@cofianza.co" className="text-primary-600 underline">hola@cofianza.co</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Seguridad de la información</h2>
            <p>
              COFIANZA implementa medidas técnicas, administrativas y organizacionales razonables para proteger la información contra pérdida, uso indebido, acceso no autorizado, alteración o fraude.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">10. Vigencia de la información</h2>
            <p>
              Los datos personales serán conservados durante el tiempo necesario para el cumplimiento de las finalidades autorizadas, las obligaciones legales y la gestión de riesgos, incluso después de terminada la relación contractual, cuando sea necesario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">11. Actualizaciones</h2>
            <p>
              COFIANZA podrá modificar esta política en cualquier momento. La versión vigente estará disponible en su sitio web o en los canales de atención.
            </p>
          </section>

          <p className="mt-8 text-sm">
            Ver también: <Link href="/terminos" className="text-primary-600 underline">Términos y Condiciones</Link>.
          </p>
        </article>
      </main>

      <PublicFooter />
    </div>
  )
}
