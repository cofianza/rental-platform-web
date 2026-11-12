import { useState, useEffect, useCallback } from 'react'
import { autorizacionPublicService } from '@/services/autorizacionService'
import type { EstadoBiometria, IAutorizacionPublicData, IPagoProspecto, IPerfilProspectoInput } from '@/types/autorizacion'
import { esErrorTransitorio, mensajeParaProspecto } from '@/lib/errorMessages'
import { correoParaEnviar, correoResultadoValido } from '@/lib/correoResultado'
import { EMAIL_RE, type ConsentKey, type PageState, type Paso } from './constantes'
import { enlaceNoActivo, mensajeIntentosRestantes, quienTramita } from './textos'
import { useSobreUsted } from './useSobreUsted'

/**
 * Todo el estado y las llamadas a la API de la página de autorización. Vive
 * en la página (no en cada paso) para que ir y volver entre pasos conserve lo
 * que el prospecto lleva. Los pasos solo pintan y avisan.
 */
export function useAutorizacion(token: string) {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [data, setData] = useState<IAutorizacionPublicData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  // Un corte de datos no es un enlace muerto: con error transitorio la
  // pantalla ofrece "Reintentar" en vez de "pide otro enlace".
  const [reintentable, setReintentable] = useState(false)
  // B7: quién pide el estudio, aparte de `data` porque las pantallas terminales
  // hacen setData(null) y sus textos lo siguen nombrando.
  const [solicitadoPor, setSolicitadoPor] = useState<string | null>(null)
  const quien = quienTramita(solicitadoPor)

  // 'bio' no es un número para no renumerar los cuatro pasos existentes: el
  // cotejo es condicional y, apagado el interruptor, el flujo es idéntico al
  // de siempre.
  const [paso, setPaso] = useState<Paso>(1)
  // §8.1: gatea el resto del paso 1. Solo se enciende cuando la API confirmó
  // que el documento escrito es el de la ficha; el mismo número viaja con la
  // firma, que lo vuelve a comparar.
  const [identidadOk, setIdentidadOk] = useState(false)
  const [documento, setDocumento] = useState('')
  const [verificandoDoc, setVerificandoDoc] = useState(false)
  const [documentoError, setDocumentoError] = useState('')
  // BLQ §1: lo que dijo el último cotejo; antes, lo que trajo el GET (API vieja: null).
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null)
  const intentos = intentosRestantes ?? data?.intentos_restantes ?? null
  // A3: un dedazo en el número detiene el enlace (la API no da otro intento),
  // así que antes de enviarlo se le muestra lo que escribió para que lo revise.
  const [repasoDoc, setRepasoDoc] = useState(false)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const [reporteMotivo, setReporteMotivo] = useState<'no_soy_yo' | 'datos_incorrectos'>('no_soy_yo')
  // M11: la pantalla «Detuvimos el proceso» dice qué sigue según el motivo.
  // null = se llegó sin reportar en esta sesión (enlace ya detenido).
  const [motivoReportado, setMotivoReportado] = useState<'no_soy_yo' | 'datos_incorrectos' | null>(null)
  const [reporteDetalle, setReporteDetalle] = useState('')
  const [reportando, setReportando] = useState(false)
  // §12: el error del reporte se muestra DENTRO del modal. La pantalla
  // "Detuvimos el proceso" sólo se pinta cuando el servidor lo confirmó.
  const [reporteError, setReporteError] = useState('')
  // §8.2 / §8.3 — todo opcional.
  const sobreUsted = useSobreUsted()
  const {
    situacion,
    tieneRut,
    dondeLabora,
    ingreso,
    presentacion,
    coaNombre,
    coaApellido,
    coaEmail,
    coaTelefono,
    setCoaEmailError,
    setCoaFaltan,
    setCoaContactoError,
  } = sobreUsted
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  // §8.4: "la casilla de aceptación no puede venir marcada por defecto".
  // Este `false` es normativo — no lo cambies a true ni lo derives de nada.
  const [acepta, setAcepta] = useState(false)
  // El correo donde quiere recibir el resultado de su evaluación: solo si la API lo pide
  // (contacto_resultado). Se prellena al confirmar su documento con el de su ficha.
  const [correoResultado, setCorreoResultado] = useState('')
  const [errorCorreo, setErrorCorreo] = useState(false)
  const [openFin, setOpenFin] = useState<number | null>(null)
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    analitica: false,
    comercial: false,
    historial_referencia: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [hashDocumento, setHashDocumento] = useState<string | null>(null)
  // §6.3: tras firmar, en la opción C todavía falta el pago. Lo dice el backend.
  const [pagoRequerido, setPagoRequerido] = useState(false)

  // Al reabrir un enlace ya firmado no sabemos si le falta pagar: lo pregunta.
  const sincronizarPago = useCallback(async (t: string) => {
    try {
      const p = await autorizacionPublicService.getPago(t)
      setPago(p)
      setPagoRequerido(p.estado !== 'no_aplica' && p.estado !== 'completado')
    } catch {
      // Sin respuesta dejamos la pantalla de exito tal cual: es el respaldo
      // por correo/WhatsApp, no una pantalla de error.
    }
  }, [])
  // Tras firmar, el enlace de pago lo crea el orquestador fire-and-forget: la
  // pantalla lo espera aqui en vez de mandar al prospecto a buscar un correo.
  const [pago, setPago] = useState<IPagoProspecto | null>(null)
  // Se agotó la espera y el enlace sigue "preparando": deja de prometerlo ya.
  const [esperaAgotada, setEsperaAgotada] = useState(false)

  const cargar = useCallback(() => {
    setPageState('loading')
    setReintentable(false)
    autorizacionPublicService
      .getData(token)
      .then((result) => {
        setData(result)
        setSolicitadoPor(result.solicitado_por ?? null)
        setPageState('form')
      })
      .catch((err) => {
        // Reabrir el enlace es un gesto normalísimo: vive en el chat de
        // WhatsApp. Si ya se firmó, esta pantalla es la de éxito, no una
        // alerta roja. Y NUNCA se renderiza err.message: es texto de servidor
        // sin tildes y con el nombre interno del enum ("estado: expirado").
        const code = (err as { code?: string })?.code
        if (code === 'AUTORIZACION_YA_FIRMADA') {
          setPageState('signed')
          void sincronizarPago(token)
          return
        }
        if (code === 'ESTUDIO_NO_ACTIVO') {
          setPageState('inactivo')
          return
        }
        const transitorio = esErrorTransitorio(err)
        setReintentable(transitorio)
        setErrorMessage(
          transitorio
            ? mensajeParaProspecto(err, 'No pudimos abrir su autorización en este momento.')
            : code === 'AUTORIZACION_EXPIRADA' ||
                code === 'AUTORIZACION_ESTADO_INVALIDO' ||
                code === 'AUTORIZACION_NOT_FOUND'
              ? enlaceNoActivo(quienTramita(null))
              : `No pudimos abrir su autorización. ${quienTramita(null)} le puede enviar un enlace nuevo; si tiene dudas, escríbanos: abajo están nuestros datos.`,
        )
        setPageState('error')
      })
  }, [token, sincronizarPago])

  useEffect(() => {
    cargar()
  }, [cargar])

  // "Atrás" del celular: cada paso es una entrada del historial. Sin esto el
  // gesto de volver sacaba al prospecto de la página y perdía lo que llevaba.
  // Pasar del paso 1 exige identidad confirmada y casilla marcada también por
  // aquí: tras recargar (estado en blanco) el historial conserva las entradas
  // de los pasos 2-4, y "Adelante" no puede saltarse la aceptación.
  const irAPaso = useCallback((p: Paso) => {
    window.history.pushState({ paso: p }, '')
    setPaso(p)
  }, [])
  const volverPaso = useCallback(() => window.history.back(), [])
  useEffect(() => {
    // La entrada actual siempre es el paso 1 (una recarga conserva el estado
    // del historial de la entrada en la que estaba).
    window.history.replaceState({ ...window.history.state, paso: 1 }, '')
  }, [])
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const p = ((e.state as { paso?: Paso } | null)?.paso ?? 1) as Paso
      setPaso(p !== 1 && !(identidadOk && acepta) ? 1 : p)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [identidadOk, acepta])

  // El paso 1 mide varios miles de px (texto legal íntegro + acordeones) y el
  // botón vive al fondo: sin este reset, al pasar al paso 2 el navegador clampa
  // el scroll al nuevo alto y el prospecto aterriza en el PIE — no llega a ver
  // ninguna de las preguntas del §8.2, justo el bloque de mayor abandono.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [paso])

  // De Beneficios (o de Identidad) a Confirmar (paso 4). Adenda 1 §7: ya no
  // hay OTP en esta etapa; el paso 4 solo confirma lo aceptado en el paso 1.
  const irAFirma = useCallback(() => {
    irAPaso(4)
    setErrorMessage('')
  }, [irAPaso])

  // Salida del paso 3. Si el backend pide biometría, se intercala el cotejo
  // antes de la confirmación final.
  const salirDeBeneficios = useCallback(() => {
    // B4: quien ya se negó ('omitida') tampoco vuelve al paso; ahí vería «reintentar».
    if (data?.biometria?.requerida && data.biometria.estado !== 'verificada' && data.biometria.estado !== 'omitida') {
      irAPaso('bio')
      return
    }
    irAFirma()
  }, [data?.biometria?.requerida, data?.biometria?.estado, irAFirma, irAPaso])

  // Barra de progreso: 4 tramos, o 5 cuando el backend pide el cotejo. El
  // índice traduce el paso 'bio' a su posición para poder compararlo.
  const conBiometria = !!data?.biometria?.requerida
  const pasosBarra = conBiometria
    ? ['Autorización', 'Sobre usted', 'Beneficios', 'Identidad', 'Confirmar']
    : ['Autorización', 'Sobre usted', 'Beneficios', 'Confirmar']
  const pasoIndice = paso === 'bio' ? 4 : paso === 4 && conBiometria ? 5 : paso

  // PASO 5 → backend. Una sola llamada al salir de "Sobre ti", con la
  // confirmación de identidad incluida. Best-effort a propósito: lo que el
  // prospecto cuenta aquí no alimenta ninguna decisión (Política V4.1 §4.2),
  // así que un fallo de red NO puede impedirle firmar.
  //
  // El silencio del catch cubre red y 5xx, NO errores de validación: los tres
  // bloques del §8 viajan en un solo POST y el backend rechazaba el body
  // entero, así que un correo mal tecleado del coarrendatario borraba también
  // la identidad, lo laboral y el ingreso. Ahora hay dos defensas: este chequeo
  // en el campo (el prospecto ve el dedazo y lo corrige) y `.catch(undefined)`
  // por campo en perfilProspectoSchema (un campo malo se cae solo).
  async function guardarPerfilYSeguir(sinCoarrendatarioPedido = false) {
    // I2: sin segundo firmante en este estudio, los datos del coarrendatario no se piden ni se envían.
    const sinCoarrendatario = sinCoarrendatarioPedido || data?.admite_segundo_firmante === false
    if (presentacion === 'acompanado' && coaEmail.trim() && !EMAIL_RE.test(coaEmail.trim()) && !sinCoarrendatario) {
      setCoaEmailError(true)
      return
    }
    setCoaEmailError(false)
    // M9: datos a medias → se avisa qué falta; nunca se descartan sin decirlo.
    if (presentacion === 'acompanado' && !sinCoarrendatario) {
      const algo = [coaNombre, coaApellido, coaEmail, coaTelefono].some((v) => v.trim())
      const faltan = [
        !coaNombre.trim() && 'su nombre',
        !coaApellido.trim() && 'su apellido',
        !coaEmail.trim() && !coaTelefono.trim() && 'su correo o su WhatsApp',
      ].filter(Boolean) as string[]
      if (algo && faltan.length) {
        setCoaFaltan(faltan)
        return
      }
    }
    setCoaFaltan([])
    setCoaContactoError(null)
    const ingresoNum = Number(ingreso.replace(/\D/g, ''))
    const perfil: IPerfilProspectoInput = {
      ...(situacion ? { situacion_laboral: situacion } : {}),
      ...(situacion === 'independiente' && tieneRut !== null ? { tiene_rut: tieneRut } : {}),
      ...(dondeLabora.trim() ? { donde_labora: dondeLabora.trim() } : {}),
      ...(ingresoNum > 0 ? { ingreso_declarado_cop: ingresoNum } : {}),
      ...(presentacion ? { presentacion } : {}),
      ...(!sinCoarrendatario && presentacion === 'acompanado' && coaNombre.trim() && coaApellido.trim() && (coaEmail.trim() || coaTelefono.trim())
        ? {
            coarrendatario: {
              nombre: coaNombre.trim(),
              apellido: coaApellido.trim(),
              ...(coaEmail.trim() ? { email: coaEmail.trim() } : {}),
              ...(coaTelefono.trim() ? { telefono: coaTelefono.trim() } : {}),
            },
          }
        : {}),
    }
    // Sin coarrendatario se avanza sin esperar. Con él se espera la respuesta:
    // si escribió su propio correo o WhatsApp, se queda aquí con el error junto
    // al campo. Un fallo de red avanza igual (nunca bloquea la firma).
    const conCoa = !!perfil.coarrendatario
    if (!conCoa) irAPaso(3)
    else setGuardandoPerfil(true)
    // UN reintento: un corte de datos móviles no debería perder en silencio lo
    // que el prospecto acaba de contar. Sigue sin bloquear la firma.
    let r: Awaited<ReturnType<typeof autorizacionPublicService.guardarPerfil>> | null = null
    try {
      r = await autorizacionPublicService.guardarPerfil(token, perfil)
    } catch {
      try {
        r = await autorizacionPublicService.guardarPerfil(token, perfil)
      } catch {
        // Silencioso y deliberado: ver el comentario de arriba.
      }
    }
    if (!conCoa) return
    setGuardandoPerfil(false)
    const errorCoa = r?.coarrendatario_error
    if (errorCoa) {
      setCoaContactoError(errorCoa)
      requestAnimationFrame(() => document.getElementById(errorCoa.campo === 'email' ? 'coa-email' : 'coa-telefono')?.focus())
      return
    }
    irAPaso(3)
  }

  // §8.1: "Se muestran el nombre y el documento registrados para que el
  // prospecto los confirme o corrija." El número NO se muestra (ni los últimos
  // dígitos: serían media respuesta para quien reciba el enlace reenviado); se
  // escribe y la API lo compara. Un error de digitación en la ficha ya no
  // termina consultando a un tercero: si no coincide, el enlace se detiene y
  // el gestor corrige y reenvía (mismo camino que "los datos están mal").
  function handleRepasarDocumento(e: React.FormEvent) {
    e.preventDefault()
    if (verificandoDoc || !documento.trim()) return
    setRepasoDoc(true)
  }

  function corregirDocumento() {
    setRepasoDoc(false)
    // Al volver, el cursor queda en el campo para corregir sin buscarlo.
    requestAnimationFrame(() => document.getElementById('numero-documento')?.focus())
  }

  // BLQ §1: le quedan intentos en este enlace. Vuelve al campo sin revelar el número registrado.
  function volverAlDocumento(restantes: number) {
    setIntentosRestantes(restantes)
    setIdentidadOk(false)
    setRepasoDoc(false)
    setPaso(1)
    setDocumentoError(mensajeIntentosRestantes(restantes))
    requestAnimationFrame(() => document.getElementById('numero-documento')?.focus())
  }

  async function handleConfirmarIdentidad() {
    if (verificandoDoc || !documento.trim()) return
    setVerificandoDoc(true)
    setDocumentoError('')
    try {
      // Una API anterior al bloque 2 no manda intentos_restantes: 0 = detenido.
      const { coincide, intentos_restantes = 0, correo_resultado } = await autorizacionPublicService.confirmarIdentidad(token, documento.trim())
      if (coincide && correo_resultado) setCorreoResultado((actual) => actual || correo_resultado)
      if (coincide) setIdentidadOk(true)
      else if (intentos_restantes > 0) volverAlDocumento(intentos_restantes)
      else setPageState('no_coincide')
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'ESTUDIO_NO_ACTIVO') {
        setPageState('inactivo')
        return
      }
      if (code === 'AUTORIZACION_EXPIRADA' || code === 'AUTORIZACION_NO_VIGENTE' || code === 'AUTORIZACION_NOT_FOUND') {
        setErrorMessage(enlaceNoActivo(quien))
        setData(null)
        setPageState('error')
        return
      }
      setDocumentoError(mensajeParaProspecto(err, 'No pudimos revisar su documento. Inténtelo otra vez.'))
      setRepasoDoc(false)
    } finally {
      setVerificandoDoc(false)
    }
  }

  // §8.1 + §12: "El prospecto reporta que no es él. El estudio se detiene, se
  // marca para revisión y se notifica al solicitante y a Cofianza."
  //
  // NO hay una opción de "corregir" el documento aquí, y no es un olvido: ese
  // número es el que la firma congela como documento del aceptante y el que el
  // backend compara contra lo que se manda al buró. Si el portador del enlace
  // pudiera reescribirlo, cualquiera podría hacer que se consulte a un tercero
  // que jamás autorizó. Corregir = detener y avisar; el gestor arregla la ficha
  // y reenvía el enlace.
  async function handleReportar() {
    setReportando(true)
    setReporteError('')
    try {
      await autorizacionPublicService.reportarIdentidad(token, {
        motivo: reporteMotivo,
        ...(reporteDetalle.trim() ? { detalle: reporteDetalle.trim() } : {}),
      })
      setReporteAbierto(false)
      setMotivoReportado(reporteMotivo)
      setPageState('reportado')
    } catch (err) {
      // ÚNICO punto de esta pantalla donde el silencio es inaceptable: la
      // pantalla "Detuvimos el proceso" afirma tres cosas (el enlace murió,
      // nadie consultará tus datos, Cofianza ya fue avisada) y ninguna es
      // cierta si el POST no llegó. Con datos móviles inestables, un 5xx o un
      // 429 del limitador por IP (las operadoras comparten CGNAT), la
      // autorización sigue 'pendiente' y FIRMABLE — justo el caso del §12 que
      // esto existe para frenar. Sólo estos códigos significan que el enlace
      // ya está muerto de todos modos; con cualquier otro el modal se queda
      // abierto y se puede reintentar.
      const code = (err as { code?: string })?.code
      if (code === 'ESTUDIO_NO_ACTIVO') {
        setReporteAbierto(false)
        setPageState('inactivo')
        return
      }
      // M1: con estos códigos el reporte NO se guardó (el API ya responde éxito
      // al reintento de un reporte que sí entró). Nada de «detuvimos el proceso»
      // ni «te enviarán un enlace nuevo»: puede que el enlace ya esté firmado.
      if (
        code === 'AUTORIZACION_EXPIRADA' ||
        code === 'AUTORIZACION_NO_VIGENTE' ||
        code === 'AUTORIZACION_NOT_FOUND'
      ) {
        setReporteAbierto(false)
        setErrorMessage(
          'Este enlace ya no está activo, así que no pudimos registrar su reporte. Si necesita algo, escríbanos: abajo están nuestros datos.',
        )
        setData(null)
        setPageState('error')
        return
      }
      setReporteError('No pudimos registrar su reporte. Revise su conexión e inténtelo otra vez.')
    } finally {
      setReportando(false)
    }
  }

  // Adenda 1 §7: la aceptación por casilla ES la autorización. El backend
  // congela texto, versión, documento, IP, fecha y dispositivo (§8.4).
  async function handleConfirmarYFirmar() {
    if (submitting) return
    setSubmitting(true)
    setErrorMessage('')
    try {
      const result = await autorizacionPublicService.firmar(token, {
        metodo_firma: 'casilla',
        // §8.1: el mismo documento que la API ya aceptó en el paso 1; la firma
        // lo vuelve a comparar (un POST directo no se salta la confirmación).
        numero_documento: documento.trim(),
        consentimientos_opcionales: consents,
        ...correoParaEnviar(data?.contacto_resultado?.requerido, correoResultado),
      })
      setHashDocumento(result.hash_documento)
      setPagoRequerido(!!result.pago_requerido)
      setPageState('signed')
    } catch (err) {
      const code = (err as { code?: string })?.code
      // Ya firmada (doble submit o reintento sobre una firma exitosa): pantalla
      // de éxito. OJO: solo para YA_FIRMADA — un enlace invalidado/expirado
      // (NO_VIGENTE) NO es éxito: mostrar "firmado" haría creer al solicitante
      // que terminó cuando nada va a correr.
      // Sólo YA_FIRMADA. ESTADO_INVALIDO estaba aquí también y podía significar
      // 'revocado': habría mostrado "firmado" sobre un enlace que ya no corre.
      if (code === 'AUTORIZACION_YA_FIRMADA') {
        setPageState('signed')
        void sincronizarPago(token)
        return
      }
      if (code === 'ESTUDIO_NO_ACTIVO') {
        setPageState('inactivo')
        return
      }
      if (code === 'DOCUMENTO_NO_COINCIDE') {
        const restantes = (err as { details?: { intentos_restantes?: number } })?.details?.intentos_restantes ?? 0
        if (restantes > 0) volverAlDocumento(restantes)
        else setPageState('no_coincide')
        return
      }
      if (code === 'AUTORIZACION_NO_VIGENTE' || code === 'AUTORIZACION_EXPIRADA') {
        setErrorMessage(enlaceNoActivo(quien))
        setData(null) // pantalla terminal: sin datos no se vuelve a pintar el paso 4 con su boton
        setPageState('error')
        return
      }
      // Aquí no hay a quién preguntarle: el prospecto no tiene sesión ni
      // soporte. Un 429 del limitador por IP o un 5xx crudo lo dejaban sin
      // saber si fue culpa suya.
      setErrorMessage(mensajeParaProspecto(err, 'No pudimos registrar su autorización. Inténtelo de nuevo.'))
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (pageState !== 'signed' || !pagoRequerido) return
    let intentos = 0
    let vivo = true
    const consultar = async () => {
      try {
        const p = await autorizacionPublicService.getPago(token)
        if (!vivo) return
        setPago(p)
        // Todo menos 'preparando' es definitivo para esta pantalla.
        if (p.payment_link_url || p.estado !== 'preparando') return true
      } catch {
        // silencioso: la pantalla ya muestra el respaldo por correo/WhatsApp
      }
      return false
    }
    // 3 minutos: el API pasa a 'sin_enlace' a los 2 de la firma.
    const id = setInterval(async () => {
      intentos += 1
      const listo = await consultar()
      if (listo || intentos >= 45) {
        clearInterval(id)
        if (!listo && vivo) setEsperaAgotada(true)
      }
    }, 4000)
    void consultar()
    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [pageState, pagoRequerido, token])

  // Paso 1: escribir en el campo del documento borra el error anterior.
  function cambiarDocumento(valor: string) {
    setDocumento(valor)
    if (documentoError) setDocumentoError('')
  }

  function cambiarCorreoResultado(v: string) {
    setCorreoResultado(v)
    if (errorCorreo && correoResultadoValido(v)) setErrorCorreo(false)
  }

  // «Acepto y continúo»: si la API pide el correo del resultado, tiene que ser válido.
  function aceptarYContinuar() {
    if (data?.contacto_resultado?.requerido && !correoResultadoValido(correoResultado)) {
      setErrorCorreo(true)
      return
    }
    irAPaso(2)
  }

  function alternarConsentimiento(key: ConsentKey) {
    setConsents((c) => ({ ...c, [key]: !c[key] }))
  }

  // M13: saltar = seguir sin encender ningún permiso opcional.
  function saltarBeneficios() {
    setConsents({ analitica: false, comercial: false, historial_referencia: false })
    salirDeBeneficios()
  }

  // El veredicto del cotejo sube a la página para que volver atrás no pida la foto otra vez.
  function actualizarBiometria(estado: EstadoBiometria) {
    setData((d) => (d?.biometria ? { ...d, biometria: { ...d.biometria, estado } } : d))
  }

  return {
    pageState,
    data,
    errorMessage,
    reintentable,
    quien,
    paso,
    identidadOk,
    documento,
    verificandoDoc,
    documentoError,
    intentos,
    repasoDoc,
    reporteAbierto,
    setReporteAbierto,
    reporteMotivo,
    setReporteMotivo,
    motivoReportado,
    reporteDetalle,
    setReporteDetalle,
    reportando,
    reporteError,
    sobreUsted,
    guardandoPerfil,
    acepta,
    setAcepta,
    correoResultado,
    errorCorreo,
    openFin,
    setOpenFin,
    consents,
    submitting,
    hashDocumento,
    pagoRequerido,
    pago,
    esperaAgotada,
    conBiometria,
    pasosBarra,
    pasoIndice,
    cargar,
    irAPaso,
    volverPaso,
    irAFirma,
    salirDeBeneficios,
    guardarPerfilYSeguir,
    handleRepasarDocumento,
    corregirDocumento,
    handleConfirmarIdentidad,
    handleReportar,
    handleConfirmarYFirmar,
    cambiarDocumento,
    cambiarCorreoResultado,
    aceptarYContinuar,
    alternarConsentimiento,
    saltarBeneficios,
    actualizarBiometria,
  }
}
