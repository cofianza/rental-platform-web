/**
 * Términos y Condiciones — versión oficial v2.1.1 (Abril 2026) entregada
 * por el equipo legal de COFIANZA S.A.S. Página pública linkada desde el
 * checkbox de registro. Mantener la URL /terminos para no romper el link.
 *
 * El placeholder [NIT_PENDIENTE] se reemplazará cuando salga el certificado
 * de Cámara de Comercio.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Cofianza',
  description: 'Términos y condiciones de uso de la plataforma digital Cofianza S.A.S.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Términos y Condiciones de Uso</h1>
          <p className="text-base text-gray-700 mt-1">Plataforma digital Cofianza</p>
          <p className="text-sm text-gray-500 mt-2">Versión 2.1.1 · Abril de 2026 · Titular: COFIANZA S.A.S.</p>
        </header>

        <article className="prose prose-sm max-w-none text-gray-700 space-y-7 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. ¿Qué regula este documento?</h2>
            <p>
              Estos Términos y Condiciones regulan el uso de la plataforma digital de COFIANZA S.A.S. (en adelante, &ldquo;COFIANZA&rdquo; o &ldquo;LA PLATAFORMA&rdquo;), mediante la cual se prestan servicios tecnológicos para:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>gestionar solicitudes de estudio de riesgo y afianzamiento,</li>
              <li>generar y firmar electrónicamente contratos y documentos relacionados,</li>
              <li>crear y administrar inventarios digitales de inmuebles,</li>
              <li>operar funcionalidades de seguimiento y gestión de cartera asociadas a los contratos afianzados,</li>
              <li>y crear inmuebles en promoción de arrendamiento propios y de terceros.</li>
            </ul>
            <p className="mt-2">
              Al registrarte, navegar o usar cualquier funcionalidad de LA PLATAFORMA, aceptas íntegramente estos Términos y Condiciones y las políticas que se mencionan como parte de ellos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Quién es Cofianza y quiénes usan la plataforma</h2>
            <p>
              COFIANZA S.A.S. es una sociedad comercial domiciliada en Colombia, identificada con NIT [pendiente de inscripción en Cámara de Comercio], propietaria y operadora de LA PLATAFORMA. Es independiente de las inmobiliarias, propietarios y arrendatarios que la utilizan y no actúa como parte en los contratos de arrendamiento que se suscriben entre ellos, salvo cuando se pacten fianzas u otros servicios propios de Cofianza.
            </p>
            <p>En estos Términos usamos:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>ACREEDOR | GESTOR</strong>: inmobiliarias, propietarios u otros aliados comerciales que crean contratos y procesos dentro de Cofianza.</li>
              <li><strong>AFIANZADOS y VINCULADOS</strong>: arrendatarios, coarrendatarios, codeudores y demás personas que firman documentos o son objeto de estudio de riesgo y fianza.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Aceptación, capacidad y jerarquía de documentos</h2>
            <p>
              LA PLATAFORMA está dirigida a personas con capacidad legal para contratar según la legislación colombiana. Los menores de edad solo pueden usarla por medio de sus representantes legales.
            </p>
            <p>
              Al crear cuenta, iniciar sesión o usar cualquier servicio de Cofianza, declaras que conoces y aceptas estos Términos y Condiciones, la Política de Tratamiento de Datos Personales y, cuando aplique, la Política de Cartera Cofianza y el Contrato de Afianzamiento correspondiente.
            </p>
            <p>
              En caso de conflicto entre estos Términos y un contrato específico firmado con Cofianza, prevalecerá el contrato específico, que se interpretará de manera armónica con la ley y con la naturaleza de los servicios de Cofianza.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Servicios de la plataforma Cofianza</h2>
            <p>
              COFIANZA presta servicios tecnológicos que apoyan, pero no sustituyen, las decisiones jurídicas y comerciales de las partes. En particular:
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">4.1 Estudios de riesgo y solicitud de fianza</h3>
            <p>
              La plataforma permite que el ACREEDOR | GESTOR inicie procesos de análisis de riesgo y, si lo desea, de afianzamiento. Para ello:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                El ACREEDOR | GESTOR envía a los AFIANZADOS y VINCULADOS un enlace o invitación de Cofianza para que autoricen consulta y reporte a centrales de riesgo (cuando aplique), acepten las políticas de datos y términos, y diligencien su información personal, laboral y financiera.
              </li>
              <li>
                Cofianza procesa esa información con sus modelos internos de riesgo y toma, a su criterio técnico y de negocio, la decisión de conceder o no fianzas, pudiendo negar solicitudes sin estar obligada a revelar todos los detalles de su modelo.
              </li>
            </ul>
            <p className="mt-2">Según el esquema comercial contratado, los estudios pueden adquirirse:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>como créditos individuales, o</li>
              <li>en bolsas o planes que permiten consumir varios estudios durante un periodo determinado.</li>
            </ul>
            <p className="mt-2">Que un estudio se complete no garantiza la aprobación de una fianza.</p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">4.2 Generación de contratos y documentos</h3>
            <p>LA PLATAFORMA permite al ACREEDOR | GESTOR:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>usar formatos de referencia de Cofianza para contratos de arrendamiento y otros documentos, o</li>
              <li>cargar sus propios modelos contractuales.</li>
            </ul>
            <p className="mt-2">
              En ambos casos, Cofianza únicamente facilita el medio tecnológico; no presta asesoría jurídica ni certifica que el contenido contractual sea apropiado para cada caso concreto. Se recomienda que el ACREEDOR | GESTOR revise los formatos con un profesional del derecho antes de utilizarlos, pues Cofianza no garantiza que se ajusten a cada situación particular. La responsabilidad por el texto, cláusulas y anexos es exclusivamente del ACREEDOR | GESTOR y de las partes firmantes.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">4.3 Firma electrónica y validación de identidad</h3>
            <p>
              Para la firma de contratos y documentos, Cofianza se apoya en proveedores de firma electrónica o digital autorizados en Colombia, bajo los lineamientos de la Ley 527 de 1999 y normas complementarias.
            </p>
            <p>El proceso puede incluir, según el proveedor:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>envío de enlaces de firma por correo, SMS u otros canales,</li>
              <li>uso de contraseñas de un solo uso (OTP),</li>
              <li>diferentes formatos de firma gráfica o electrónica,</li>
              <li>verificaciones biométricas y sellos de tiempo.</li>
            </ul>
            <p className="mt-2">
              Cada firmante es responsable de revisar el documento antes de firmarlo. Cofianza no se considera parte de dichos documentos, salvo que aparezca expresamente como tal.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">4.4 Inventarios digitales</h3>
            <p>
              Cofianza ofrece un módulo de Inventario Digital para describir el estado del inmueble y los bienes entregados al arrendatario, apoyando la evidencia en caso de reclamaciones posteriores.
            </p>
            <p>El flujo general es:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>El ACREEDOR | GESTOR crea el inventario en la plataforma (espacios, elementos, estado, fotos y/o videos).</li>
              <li>La plataforma puede enviar al VINCULADO un enlace y un código para que revise, comente y apruebe o rechace el inventario.</li>
              <li>Si lo aprueba, Cofianza registra la aceptación (fecha, hora, IP y códigos) y conserva el documento en su nube, permitiendo su descarga posterior.</li>
            </ul>
            <p className="mt-2">
              El contenido del inventario es responsabilidad del ACREEDOR | GESTOR. Cofianza no garantiza que la descripción corresponda a la realidad física del inmueble ni participa en la negociación de acuerdos sobre daños o faltantes.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">4.5 Gestión y seguimiento de cartera (cuando aplique)</h3>
            <p>
              Cuando el servicio contratado lo incluya, la plataforma Cofianza puede ofrecer funcionalidades de gestión y seguimiento de cartera, tales como:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>visualización de saldos, edades de mora y etapas de cobro,</li>
              <li>envío de recordatorios y comunicaciones de cobro por canales habilitados,</li>
              <li>registro de pagos, acuerdos y novedades.</li>
            </ul>
            <p className="mt-2">
              En estos casos, la Política de Cartera Cofianza complementa estos Términos y establece las reglas de intereses, honorarios, reportes y demás condiciones de gestión de mora.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Esquemas comerciales y vigencias</h2>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">5.1 Créditos digitales Cofianza</h3>
            <p>Cofianza puede ofrecer sus servicios en alguna de estas modalidades (o una combinación de ellas):</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Créditos individuales</strong>: compras puntuales de un estudio, una firma o un inventario.</li>
              <li><strong>Bolsas de créditos</strong>: compras anticipadas de cierto número de estudios, firmas o inventarios, con un periodo definido para su uso.</li>
              <li><strong>Planes de suscripción</strong>: pagos periódicos que incluyen un número mensual de estudios, firmas, inventarios y/o usuarios activos.</li>
            </ul>
            <p className="mt-2">
              Las condiciones específicas (cantidad, precio y vigencia) se mostrarán en la oferta comercial correspondiente dentro de LA PLATAFORMA.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-1">5.2 Duración y uso</h3>
            <p>Salvo que se indique otra cosa en la oferta concreta, como referencia general:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Las bolsas de estudios de riesgo podrán utilizarse dentro de los 60 días siguientes a su compra.</li>
              <li>Las bolsas de firmas e inventarios digitales podrán utilizarse dentro de los 12 meses siguientes.</li>
              <li>Los créditos incluidos en planes mensuales se consumirán durante el mes en curso y no se acumularán automáticamente al mes siguiente, salvo que se pacte lo contrario.</li>
            </ul>
            <p className="mt-2">
              Una vez vencido el plazo correspondiente, los créditos no utilizados se entenderán caducados, sin lugar a reembolso. Esta condición se informará de manera destacada en la pantalla de confirmación de compra, antes de que el usuario complete el pago, conforme a lo exigido por la Ley 1480 de 2011.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Pagos, facturación y medios de cobro</h2>
            <p>
              Los pagos se realizan a través de las pasarelas y medios electrónicos que Cofianza ponga a disposición (por ejemplo, tarjetas, PSE, efectivo por convenios, etc.).
            </p>
            <p>
              LA PLATAFORMA o la pasarela pueden pedir datos de contacto y facturación, pero Cofianza no almacena los datos sensibles de tarjetas ni de cuentas bancarias, de acuerdo con las normas de seguridad aplicables.
            </p>
            <p>Los comprobantes de pago y facturas estarán disponibles por medios electrónicos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Límites de responsabilidad tecnológica</h2>
            <p>Cofianza y sus proveedores tecnológicos no garantizan disponibilidad ininterrumpida. Pueden existir interrupciones por:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>labores de mantenimiento,</li>
              <li>fallas de terceros,</li>
              <li>problemas de conectividad del propio usuario, entre otros.</li>
            </ul>
            <p className="mt-2">Cofianza no será responsable por:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>imposibilidad de acceso a la plataforma por causas ajenas a su control,</li>
              <li>errores u omisiones en la información ingresada por el ACREEDOR | GESTOR o sus VINCULADOS,</li>
              <li>contenido de contratos, inventarios o documentos que las partes decidan firmar.</li>
            </ul>
            <p className="mt-2">
              Cuando un estudio, firma o inventario ya ha sido efectivamente iniciado o enviado, el crédito respectivo se entenderá consumido, incluso si el usuario cometió errores en la información. Sin embargo, si el crédito se consumió por un error técnico imputable exclusivamente a la plataforma, el usuario podrá reclamarlo a Cofianza dentro de los cinco (5) días hábiles siguientes al evento, mediante los canales de contacto indicados en la sección 13, y Cofianza evaluará la reposición del crédito según el caso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Nube, seguridad y respaldo</h2>
            <p>
              La información se almacena en servicios en la nube que cumplen estándares razonables de seguridad. Cofianza adoptará medidas técnicas y organizativas para proteger los datos, pero no puede garantizar seguridad absoluta frente a todo riesgo.
            </p>
            <p>
              En caso de incidentes graves de seguridad, Cofianza actuará conforme a sus protocolos internos y a lo exigido por la normativa colombiana en materia de datos personales e incidentes de seguridad de la información.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Propiedad intelectual</h2>
            <p>
              Las marcas, logotipos, diseño, código y demás elementos de Cofianza están protegidos por normas de derechos de autor y propiedad industrial. El uso de la plataforma no otorga licencia alguna más allá de la necesaria para utilizar el servicio.
            </p>
            <p>
              Los modelos de contrato o textos que el ACREEDOR | GESTOR cargue como propios seguirán siendo de su titularidad; Cofianza solo requiere una licencia limitada para alojarlos y mostrarlos dentro de LA PLATAFORMA para el correcto funcionamiento del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">10. Derechos, obligaciones y conductas prohibidas</h2>
            <p>El ACREEDOR | GESTOR tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>acceder a las funcionalidades contratadas,</li>
              <li>recibir soporte técnico razonable,</li>
              <li>consultar, actualizar y rectificar sus datos personales.</li>
            </ul>
            <p className="mt-2">Y está obligado a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>mantener la confidencialidad de sus credenciales,</li>
              <li>usar la plataforma de forma lícita y respetuosa,</li>
              <li>revisar cuidadosamente los documentos antes de enviarlos a firmar o aprobar.</li>
            </ul>
            <p className="mt-2">Se prohíbe, entre otros:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>revender sin autorización los servicios de Cofianza,</li>
              <li>intentar acceder o manipular cuentas de terceros,</li>
              <li>usar la plataforma para actividades ilícitas o para lavar activos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">11. Datos personales y comunicaciones</h2>
            <p>
              El uso de la plataforma implica el tratamiento de datos personales y, en algunos casos, datos sensibles (como datos biométricos). El tratamiento de datos biométricos, por ser datos sensibles conforme a la Ley 1581 de 2012, requiere autorización expresa e independiente del titular, la cual se recabará en el momento del proceso de verificación de identidad. Ese tratamiento se rige por la <Link href="/privacidad" className="text-primary-600 underline">Política de Tratamiento de Datos Personales</Link> de Cofianza, disponible en www.cofianza.co y por la normatividad colombiana vigente.
            </p>
            <p>Cofianza podrá enviar al correo, teléfono o canales registrados por el usuario:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>notificaciones de seguridad,</li>
              <li>avisos sobre procesos de firma, inventarios, estudios y gestión de cartera,</li>
              <li>comunicaciones comerciales, en los términos autorizados por el usuario.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">12. Modificaciones y nulidad parcial</h2>
            <p>
              Cofianza puede ajustar estos Términos y Condiciones. Los cambios sustanciales —aquellos que afecten precios, vigencias de créditos, coberturas o condiciones económicas— se notificarán con al menos treinta (30) días calendario de antelación por correo electrónico o mediante aviso en LA PLATAFORMA, y aplicarán únicamente a compras y contratos realizados después de su entrada en vigencia; los créditos ya adquiridos bajo condiciones anteriores se regirán por los términos vigentes al momento de su compra. Los cambios de menor impacto —como correcciones de redacción, actualización de datos de contacto o ajustes de forma— podrán aplicarse de inmediato con notificación simultánea. La versión vigente será siempre la publicada en LA PLATAFORMA. El uso continuado de los servicios después del vencimiento del preaviso implica aceptación de las modificaciones para nuevas compras y contratos.
            </p>
            <p>
              Si alguna cláusula resulta inválida o inaplicable, ello no afectará la validez de las demás disposiciones, que seguirán vigentes en lo que corresponda.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">13. Canales de contacto</h2>
            <p>Para consultas, quejas o reclamos sobre la plataforma Cofianza, puedes escribir a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Correo: <a href="mailto:hola@cofianza.co" className="text-primary-600 underline">hola@cofianza.co</a></li>
              <li>Sitio web: <a href="https://www.cofianza.co" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">www.cofianza.co</a></li>
            </ul>
            <p className="mt-2">
              Si presentaste una queja o reclamo ante Cofianza y no obtuviste respuesta satisfactoria dentro de los quince (15) días hábiles siguientes, puedes acudir a la Superintendencia de Industria y Comercio (SIC) como autoridad de protección al consumidor, en <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">www.sic.gov.co</a> o en sus canales de atención, conforme a lo dispuesto en la Ley 1480 de 2011 (Estatuto del Consumidor).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">14. Jurisdicción y domicilio contractual</h2>
            <p>
              Para todos los efectos legales derivados del uso de LA PLATAFORMA y de estos Términos y Condiciones, las partes acuerdan como domicilio contractual la ciudad de Medellín, Antioquia, Colombia. Cualquier controversia que no sea resuelta directamente entre las partes se someterá a la jurisdicción ordinaria de Medellín, sin perjuicio de las disposiciones legales imperativas sobre competencia territorial ni de los derechos del consumidor reconocidos por la Ley 1480 de 2011.
            </p>
          </section>

          <p className="mt-8 text-sm">
            Ver también: <Link href="/privacidad" className="text-primary-600 underline">Política de Tratamiento de Datos Personales</Link>.
          </p>
        </article>
      </main>

      <PublicFooter />
    </div>
  )
}
