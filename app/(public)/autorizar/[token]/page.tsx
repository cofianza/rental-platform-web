/**
 * Página pública de autorización de tratamiento de datos (habeas data).
 * Sin login: token-gated. Tarjeta centrada + header de marca + 4 pasos —
 *   Paso 1: §8.1 confirmación de identidad (el prospecto ESCRIBE su número de
 *           documento y la API lo compara con la ficha sin revelarlo; si no
 *           coincide, el enlace se detiene) → finalidades + autorización legal
 *           + aceptación (obligatorio). El resto del paso NO se muestra hasta
 *           que el prospecto confirma quién es: confirmar antes de leer qué
 *           autoriza es el orden lógico del §8.1, y de paso deja de aterrizar
 *           en un muro legal.
 *   Paso 2: §8.2 laboral + ingreso y §8.3 solo/acompañado ("Sobre ti").
 *   Paso 3: beneficios (3 consentimientos OPCIONALES con toggle).
 *   Paso 'bio': cotejo biométrico AucoFace — SOLO si el backend lo pide
 *           (AUCO_BIOMETRIA_ENABLED). Política Anexo A + §14.
 *   Paso 4: confirmación + resumen. SIN OTP (Adenda 1 §7, Gerencia 07/09/2026:
 *           "No se implementa OTP en el flujo de autorización del estudio").
 *           La aceptación por casilla es la firma (Decreto 1377/2013, art. 7).
 *
 * EL PASO 'bio' VA ANTES DE LA FIRMA Y DESPUÉS DE LA ACEPTACIÓN, y ese orden
 * es legal, no estético: la foto del rostro es dato sensible (Ley 1581 art. 5)
 * y no se puede capturar antes de que el prospecto acepte el texto que la
 * declara — el texto que se le presenta en el paso 1 ya es la versión
 * 3.0-biometria cuando el interruptor está encendido.
 *
 * Sin OTP el orden de los pasos ya no lo dicta un reloj; se conserva porque
 * §8.2/§8.3 son opcionales y la confirmación final debe ser lo último.
 *
 * Todo lo de "Sobre ti" es OPCIONAL y el botón Continuar nunca se deshabilita:
 * el propio documento señala §8.2 como el punto de mayor abandono, y lo único
 * irrecuperable de esta pantalla es la firma.
 *
 * Esta página solo orquesta: el estado y las llamadas a la API viven en
 * _pasos/useAutorizacion.ts, y cada paso o pantalla en su archivo de _pasos/.
 */

'use client'

import { useParams } from 'next/navigation'
import { CapturaBiometrica, nombreDocumento } from '@/components/public/CapturaBiometrica'
import { EsqueletoFlujo } from '@/components/public/EsqueletoFlujo'
import { Card } from './_pasos/Card'
import { BarraProgreso, EncabezadoMarca } from './_pasos/Encabezado'
import { ModalReporte } from './_pasos/ModalReporte'
import { PantallaFirmada } from './_pasos/PantallaFirmada'
import { PantallaError, PantallaInactivo, PantallaNoCoincide, PantallaReportado } from './_pasos/PantallasCierre'
import { PasoAutorizacion } from './_pasos/PasoAutorizacion'
import { PasoBeneficios } from './_pasos/PasoBeneficios'
import { PasoConfirmar } from './_pasos/PasoConfirmar'
import { PasoSobreUsted } from './_pasos/PasoSobreUsted'
import { useAutorizacion } from './_pasos/useAutorizacion'

export default function AutorizarPage() {
  const params = useParams()
  const token = params.token as string
  const a = useAutorizacion(token)
  const { pageState, data, paso, quien } = a

  // ── Pantallas de estado ────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <EsqueletoFlujo bloques={1} campos={4} etiqueta="Cargando su autorización…" className="mx-auto max-w-lg" />
    )
  }

  if (pageState === 'error' && !data) {
    return (
      <Card>
        <PantallaError reintentable={a.reintentable} errorMessage={a.errorMessage} onReintentar={a.cargar} />
      </Card>
    )
  }

  if (pageState === 'reportado') {
    return (
      <Card>
        <PantallaReportado quien={quien} motivoReportado={a.motivoReportado} />
      </Card>
    )
  }

  if (pageState === 'inactivo') {
    return (
      <Card>
        <PantallaInactivo quien={quien} />
      </Card>
    )
  }

  if (pageState === 'no_coincide') {
    return (
      <Card>
        <PantallaNoCoincide quien={quien} />
      </Card>
    )
  }

  if (pageState === 'signed') {
    return (
      <Card>
        <PantallaFirmada
          pagoRequerido={a.pagoRequerido}
          pago={a.pago}
          esperaAgotada={a.esperaAgotada}
          quien={quien}
          sinInmueble={!!data && data.expediente.inmueble === null}
          hashDocumento={a.hashDocumento}
        />
      </Card>
    )
  }

  return (
    <Card>
      <EncabezadoMarca />
      <BarraProgreso pasosBarra={a.pasosBarra} pasoIndice={a.pasoIndice} />

      <div className="px-5 py-5">
        {paso === 1 && data && (
          <PasoAutorizacion
            data={data}
            quien={quien}
            intentos={a.intentos}
            identidadOk={a.identidadOk}
            repasoDoc={a.repasoDoc}
            documento={a.documento}
            documentoError={a.documentoError}
            verificandoDoc={a.verificandoDoc}
            conBiometria={a.conBiometria}
            openFin={a.openFin}
            setOpenFin={a.setOpenFin}
            correoResultado={a.correoResultado}
            errorCorreo={a.errorCorreo}
            acepta={a.acepta}
            setAcepta={a.setAcepta}
            onCambiarDocumento={a.cambiarDocumento}
            onRepasarDocumento={a.handleRepasarDocumento}
            onConfirmarIdentidad={a.handleConfirmarIdentidad}
            onCorregirDocumento={a.corregirDocumento}
            onReportar={() => a.setReporteAbierto(true)}
            onCambiarCorreo={a.cambiarCorreoResultado}
            onAceptarYContinuar={a.aceptarYContinuar}
          />
        )}

        {paso === 2 && (
          <PasoSobreUsted
            estado={a.sobreUsted}
            admiteSegundoFirmante={data?.admite_segundo_firmante}
            guardandoPerfil={a.guardandoPerfil}
            onContinuar={() => a.guardarPerfilYSeguir()}
            onSeguirSinDatos={() => a.guardarPerfilYSeguir(true)}
            onSaltar={() => a.irAPaso(3)}
            onVolver={a.volverPaso}
          />
        )}

        {paso === 3 && (
          <PasoBeneficios
            consents={a.consents}
            onAlternar={a.alternarConsentimiento}
            onContinuar={a.salirDeBeneficios}
            onSaltar={a.saltarBeneficios}
            onVolver={a.volverPaso}
          />
        )}

        {/* ── Paso 'bio': verificación de identidad (Política Anexo A + §14).
            El componente NUNCA bloquea: `onContinuar` se dispara igual si el
            cotejo falla o si el prospecto ejerce su derecho a negarse. ── */}
        {paso === 'bio' && (
          <CapturaBiometrica
            token={token}
            estadoPrevio={data?.biometria?.estado ?? null}
            documentoNombre={nombreDocumento(data?.solicitante.tipo_documento)}
            onContinuar={a.irAFirma}
            onVolver={a.volverPaso}
            onResultado={a.actualizarBiometria}
          />
        )}

        {paso === 4 && (
          <PasoConfirmar
            pago={data?.pago}
            quien={quien}
            consents={a.consents}
            errorMessage={a.errorMessage}
            submitting={a.submitting}
            onConfirmar={a.handleConfirmarYFirmar}
            onVolver={a.volverPaso}
          />
        )}
      </div>

      <ModalReporte
        abierto={a.reporteAbierto}
        reportando={a.reportando}
        motivo={a.reporteMotivo}
        onMotivo={a.setReporteMotivo}
        detalle={a.reporteDetalle}
        onDetalle={a.setReporteDetalle}
        error={a.reporteError}
        onCerrar={() => a.setReporteAbierto(false)}
        onEnviar={a.handleReportar}
      />
    </Card>
  )
}
