/**
 * Página de detalle de expediente - HP-243, HP-295
 * Vista detallada con tabs, barra de progreso y acciones contextuales
 * HP-295: Documentos con drag & drop upload
 */

'use client'

import { AYUDA, queSigue } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { Button } from '@/components/ui/Button'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import { ExcepcionTopeBlock } from '@/components/expedientes/ExcepcionTopeBlock'
import { ApiClientError } from '@/lib/api'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { ExpedienteRefrescoContext } from '@/components/expedientes/ExpedienteRefresco'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Tabs, Badge, Avatar } from '@/components/ui'
import type { Tab } from '@/components/ui/Tabs'
import type { IEstudio, IEstudioHistorial, IMotivosElegidos } from '@/types/estudio'
import {
  IconArrowLeft,
  IconEdit,
  IconRefresh,
  IconUser,
  IconUserCheck,
  IconFolderOpen,
  IconAlertTriangle,
  IconX,
  IconCheck,
  IconLoader,
  IconArrowRight,
  IconClock,
  IconBuilding2,
} from '@/components/icons'
import {
  ExpedienteProgressBar,
  TransicionModal,
  ComentariosSection,
  TimelineSection,
  WhatsappMensajesSection,
  AsignacionResponsableModal,
  DocumentosSection,
  EstudiosSection,
  AutorizacionSection,
  ContratosSection,
  CitasSection,
  EstudioSolicitanteCard,
  ContratoSolicitanteCard,
  AccionContratoPendienteCard,
  AccionHabilitarEstudioCard,
  AprobarCondicionadoCard,
  CoarrendatarioCard,
  CoarrendatarioPropietarioCard,
  ExpedienteRechazadoBanner,
  miembroDebeCompletarPerfil,
  ContratoEstadoCard,
  EstudioEstadoCard,
} from '@/components/expedientes'
import { esCondicionadoSinInfo } from '@/components/expedientes/ReintentarEstudioForm'
import { ResumenPorEtapa, Plegable } from '@/components/expedientes/ResumenPorEtapa'
import { TarjetaSiguientePaso } from '@/components/expedientes/TarjetaSiguientePaso'
import { analistaAjeno, textoTurno, turnoPropio } from '@/components/expedientes/PastillaTurno'
import { revisionDemorada } from '@/lib/etapaFila'
import { PagosSection, PagoEstudioSection, LineaPagoEstudio } from '@/components/pagos'
import { useAuthStore } from '@/stores/auth.store'
import { useEtapaEstudio, ETAPA_LABEL, turnoDeEtapa } from '@/hooks/useEtapaEstudio'
import { pazYSalvoPendiente, pazYSalvoYaCargado } from '@/lib/pazYSalvo'
import { expedienteService } from '@/services/expedienteService'
import { estudioService } from '@/services/estudioService'
import { coarrendatarioService } from '@/services/coarrendatarioService'
import { solicitanteService } from '@/services/solicitanteService'
import { TIPO_LABELS } from '@/components/inmuebles/constants'
import { ResponsableMiembroCard } from '@/components/equipo/ResponsableMiembroCard'
import { formatCurrency, formatDate } from '@/lib/constants'
import type {
  IExpedienteDetalle,
  ITransicionDisponible,
  EstadoExpediente,
  IEvaluacionRevisionManual,
} from '@/types/expediente'
import { formatNumeroEstudio } from '@/lib/utils'
import { documento } from '@/components/contratos/v3/campos'
import { textoVisible, esRolInterno, fechaCondicion } from '@/components/expedientes/textoVisible'

export default function ExpedienteDetallePage() {
  const params = useParams()
  const id = params.id as string
  const user = useAuthStore((s) => s.user)
  // El arrendatario vuelve a SU lista (el dashboard); /expedientes es la
  // bandeja operativa del equipo.
  const rutaListado = user?.rol === 'solicitante' ? '/dashboard' : '/expedientes'
  // Miembro del equipo (no titular) con perfil personal incompleto: no puede
  // administrar el expediente hasta completar sus datos (banner + acciones
  // deshabilitadas; el backend además bloquea las mutaciones).
  const bloqueadoPorPerfil = miembroDebeCompletarPerfil(user)

  // Pendientes count for badge
  const [pendientesCount, setPendientesCount] = useState(0)

  // Tabs por rol:
  // - solicitante: solo Resumen (concentra todo el "siguiente paso").
  // - propietario / inmobiliaria: gestion del expediente sin las herramientas
  //   internas del operador (Comentarios e Historial son notas/eventos que
  //   el backend restringe a los roles internos).
  // - admin/operador/gerencia: todas las pestañas (Gerencia solo lee los
  //   comentarios: el API le abre el GET, no el POST).
  const isInternalRole =
    user?.rol === 'administrador'
    || user?.rol === 'operador_analista'
    || user?.rol === 'gerencia_consulta'

  // Gerencia consulta ve el expediente pero no asigna: el bloque de
  // "Responsable" se le ocultaba mal (isInternalRole la incluye).
  const puedeAsignar = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // Gerencia y el miembro solo lectura ven el estudio completo, pero sin las
  // tarjetas de acción: el API les rechaza cualquier cambio.
  const puedeEditar = usePuedeEditar()
  // Miembro con el perfil incompleto: ve el estudio, pero las acciones esperan a que lo complete.
  const puedeActuar = puedeEditar && !bloqueadoPorPerfil

  const tabs: Tab[] = user?.rol === 'solicitante'
    ? [{ id: 'resumen', label: 'Resumen' }]
    : [
        { id: 'resumen', label: 'Resumen' },
        { id: 'documentos', label: 'Documentos', count: pendientesCount > 0 ? pendientesCount : undefined },
        { id: 'estudios', label: 'Evaluación' },
        { id: 'contratos', label: 'Contratos' },
        { id: 'pagos', label: 'Pagos' },
        ...(isInternalRole
          ? [
              { id: 'comentarios', label: 'Comentarios' },
              { id: 'timeline', label: 'Historial' },
            ]
          : []),
      ]

  // Estado principal
  const [expediente, setExpediente] = useState<IExpedienteDetalle | null>(null)
  const [transiciones, setTransiciones] = useState<ITransicionDisponible[] | null>([])
  const [isLoading, setIsLoading] = useState(true)
  // Sube en cada carga correcta; las tarjetas lo leen por contexto y se
  // refrescan en sitio (sin desmontarse ni pasar por el skeleton de página).
  const [cargas, setCargas] = useState(0)
  // Etapa real del estudio (revisión del Resumen, 23-oct): ordena el Resumen, la barra y el chip.
  const { etapa, esperaHasta, coaFallido } = useEtapaEstudio(
    user?.rol === 'solicitante' ? null : expediente,
    user?.rol !== 'gerencia_consulta',
    cargas,
  )
  const expedienteCargadoRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Estado de tabs
  const [activeTab, setActiveTab] = useState('resumen')
  // Cada clic en «Reevaluar con documentos» del banner abre la apelación del
  // titular una vez: EstudiosSection lo devuelve a 0 al atenderlo (F5).
  const [pedidoReevaluar, setPedidoReevaluar] = useState(0)
  const pedidoAtendido = useCallback(() => setPedidoReevaluar(0), [])
  // Documentos queda montado (oculto) por el contador de pendientes; al abrir
  // la pestaña se remonta para traer lo último, como antes.
  const [visitasDocumentos, setVisitasDocumentos] = useState(0)
  const cambiarTab = (tab: string) => {
    if (tab === 'documentos' && activeTab !== 'documentos') setVisitasDocumentos((n) => n + 1)
    setActiveTab(tab)
  }

  // 3.1: nº total de expedientes de esta persona — permite al gestor "evaluar
  // cada caso" cuando la ficha se reutilizó (el toast del wizard es efímero).
  // Solo roles con solicitantes:read en el RBAC de la API (propietario NO lo
  // tiene — incluirlo generaría un 403 en cada carga del detalle).
  const [solicitanteExpCount, setSolicitanteExpCount] = useState<number | null>(null)
  const solicitanteId = expediente?.solicitante?.id
  const esRolGestor =
    user?.rol === 'administrador' ||
    user?.rol === 'operador_analista' ||
    user?.rol === 'inmobiliaria'
  useEffect(() => {
    if (!solicitanteId || !esRolGestor) {
      setSolicitanteExpCount(null)
      return
    }
    let cancel = false
    solicitanteService
      .getSolicitanteById(solicitanteId)
      .then((s) => { if (!cancel) setSolicitanteExpCount(s.expedientes_count ?? null) })
      .catch(() => { if (!cancel) setSolicitanteExpCount(null) })
    return () => { cancel = true }
  }, [solicitanteId, esRolGestor])

  // Condicionado SIN score = el buró no tenía datos de la persona, no "riesgo
  // medio". El banner y la tarjeta de decisión cambian el texto con esto.
  // También da el "Reasignado desde …" del Flujo §11 (lo trae el listado de
  // estudios, que la tarjeta del estudio ya pide: la petición se comparte).
  const [titular, setTitular] = useState<(IEstudio & { reasignado_desde?: string | null }) | null>(null)
  // Observaciones del coarrendatario en revisión (como «En revisión» de rotuloEvaluacion):
  // sus motivos van agrupados en la tarjeta de la decisión.
  const [obsCoaRevision, setObsCoaRevision] = useState<string | null>(null)
  // La evaluación del titular cuya apelación muestra el banner: la última
  // decidida o una reevaluación (hija). Una evaluación nueva sin correr no es
  // de esa cadena. Si la lista no se pudo leer, el banner ofrece la apelación genérica.
  const [apelableId, setApelableId] = useState<string | null>(null)
  const [listaFallo, setListaFallo] = useState(false)
  const [reasignadoDesde, setReasignadoDesde] = useState<string | null>(null)
  const estadoExpediente = expediente?.estado
  const actualizadoEn = expediente?.updated_at
  // Adenda 5 §7: exigir el paz y salvo no mueve el expediente (sigue en revisión),
  // así que en revisión el titular se relee con cada carga, no solo al cambiar.
  const recargaEnRevision = estadoExpediente === 'condicionado' ? cargas : 0
  // Última lectura correcta (id, estado y updated_at). Una relectura por recarga con la
  // misma clave es nueva respecto de main: si falla, se conserva lo leído (un 429 no
  // borra la condición del coarrendatario ni el paz y salvo).
  const titularLeidoRef = useRef<string | null>(null)
  useEffect(() => {
    if (!estadoExpediente) return
    const clave = `${id}|${estadoExpediente}|${actualizadoEn ?? ''}`
    let cancel = false
    estudioService
      .getEstudiosForExpediente(id, 1, 10)
      .then(({ data }) => {
        const filas = data as Array<IEstudio & { reasignado_desde?: string | null }>
        const vigente = filas
          .filter((e) => e.estado !== 'cancelado' && e.tipo !== 'con_coarrendatario')
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
        const apelable = filas
          .filter((e) => e.tipo !== 'con_coarrendatario' && (e.estado === 'completado' || !!e.estudio_padre_id))
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
        if (cancel) return
        titularLeidoRef.current = clave
        setTitular(vigente ?? null)
        const coa = filas
          .filter((e) => e.estado !== 'cancelado' && e.tipo === 'con_coarrendatario')
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
        setObsCoaRevision(coa?.estado === 'completado' && coa.resultado === 'condicionado' ? (coa.observaciones ?? null) : null)
        setApelableId(apelable?.id ?? null)
        setListaFallo(false)
        setReasignadoDesde(filas.find((e) => e.reasignado_desde)?.reasignado_desde ?? null)
      })
      .catch(() => {
        if (cancel) return
        // Relectura por recarga (mismo id, estado y updated_at): main no la hacía; se conserva lo último.
        if (titularLeidoRef.current === clave) return
        setTitular(null)
        setObsCoaRevision(null)
        setApelableId(null)
        setListaFallo(true)
      })
    return () => { cancel = true }
  }, [id, estadoExpediente, actualizadoEn, recargaEnRevision])
  // F6/F3: el banner del rechazo ofrece la apelación solo si la API la admite,
  // con su último día real. El historial de cualquier evaluación de la cadena
  // la trae entera: se relee con cada carga del estudio (en un rechazado son
  // pocas), nunca en otro estado ni para el prospecto.
  const enRechazo = estadoExpediente === 'rechazado' && !!user && user.rol !== 'solicitante'
  const leerApelacion = enRechazo && !!apelableId
  const [apelacion, setApelacion] = useState<{ de: string; h: IEstudioHistorial | null } | null>(null)
  useEffect(() => {
    if (!leerApelacion || !apelableId) return
    let cancel = false
    estudioService.getHistorial(apelableId).then(
      (h) => { if (!cancel) setApelacion({ de: apelableId, h }) },
      () => { if (!cancel) setApelacion({ de: apelableId, h: null }) },
    )
    return () => { cancel = true }
  }, [leerApelacion, apelableId, cargas])
  const apelacionTitular = enRechazo && listaFallo ? null : apelacion && apelacion.de === apelableId ? apelacion.h : undefined
  const titularCondicionado = estadoExpediente === 'condicionado' ? titular : null
  const condicionadoSinInfo =
    estadoExpediente === 'condicionado' && !!titularCondicionado && esCondicionadoSinInfo(titularCondicionado)
  // Política §14 caso L: ninguna central respondió; Cofianza puede volver a consultar.
  // También cuando una central falló y la otra respondió sin puntaje.
  const estudioSinCentrales =
    (titularCondicionado?.sin_centrales || titularCondicionado?.reconsulta_sin_datos) &&
    titularCondicionado.estado === 'completado'
      ? titularCondicionado.id
      : null
  const reconsultaParcial = !!estudioSinCentrales && !titularCondicionado?.sin_centrales
  // Adenda 3 §6: aprobado con condición de coarrendatario (la API responde 409
  // a aprobarlo a mano, pedir soportes y reasignar).
  const condicionCoa = titularCondicionado?.condicion_coarrendatario ?? null
  // Adenda 5 §7: aprobado sujeto a paz y salvo. Como la condición, espera al
  // candidato (no al analista) y la API responde 409 a aprobarlo a mano.
  const pazYSalvoTitular = titularCondicionado?.paz_y_salvo ?? null
  const pazYSalvo = pazYSalvoPendiente(pazYSalvoTitular) ? pazYSalvoTitular : null
  // Ya cargado, el turno es de Cofianza (revisarlo y acreditarlo), aunque aprobar a
  // mano siga cerrado hasta acreditarlo. Lo dice el propio estudio, con el criterio
  // del barrido y de la lista (paz_y_salvo_cargado), para los cinco roles: Cofianza y
  // Gerencia reciben cuándo (cargado_en); la inmobiliaria y el propietario, solo que
  // ya se cargó (§10). Sin petición aparte. Con ADENDA5 apagada `pazYSalvo` es null.
  const pazYSalvoCargadoEn = pazYSalvo?.cargado_en ?? null
  const pazYSalvoRecibido = !!pazYSalvo && pazYSalvoYaCargado(pazYSalvo)
  // La decisión espera algo del candidato: el coarrendatario o el paz y salvo (sin cargar).
  const esperaCandidato = !!condicionCoa || (!!pazYSalvo && !pazYSalvoRecibido)
  // Con la condición o el paz y salvo pendiente (cargado o no) la API responde 409 a aprobar.
  const aprobacionCerrada = !!condicionCoa || !!pazYSalvo

  // Decisión 2: la invitación del coarrendatario sigue en pie en revisión o
  // aprobado antes del contrato (`vigente`, la regla del API); mientras tanto
  // su evaluación fallida se reintenta. Sin leerla (cargando o error) manda
  // «condicionado», la regla de antes. Solo quien puede reintentar la pide.
  // Desde el 23-oct el coarrendatario se consulta también antes de la decisión
  // (sin esperar al titular): su evaluación lista se puede ejecutar ya.
  const ventanaCoaAplica =
    puedeEditar &&
    user?.rol !== 'solicitante' &&
    ['borrador', 'en_revision', 'informacion_incompleta', 'condicionado', 'aprobado'].includes(estadoExpediente ?? '')
  const [coaVigenteApi, setCoaVigenteApi] = useState<boolean | null>(null)
  useEffect(() => {
    if (!ventanaCoaAplica) return
    let cancel = false
    coarrendatarioService.getVentana(id).then(
      (v) => { if (!cancel) setCoaVigenteApi(v.vigente) },
      () => { if (!cancel) setCoaVigenteApi(null) },
    )
    return () => { cancel = true }
  }, [id, ventanaCoaAplica, estadoExpediente, actualizadoEn])
  const coarrendatarioVigente = (ventanaCoaAplica ? coaVigenteApi : null) ?? estadoExpediente === 'condicionado'

  // Estado de modales
  const [showTransicionModal, setShowTransicionModal] = useState(false)
  const [showAsignacionModal, setShowAsignacionModal] = useState(false)
  const [isExecutingTransicion, setIsExecutingTransicion] = useState(false)
  const [isAsignando, setIsAsignando] = useState(false)
  // Adenda 1 contratos (respuesta 21): el administrador puede cerrar sin acta, con motivo.
  // `motivoCierre` es lo que ya escribió al intentar cerrar: el diálogo abre con él.
  const [pedirCierreSinActa, setPedirCierreSinActa] = useState(false)
  const [motivoCierre, setMotivoCierre] = useState('')
  const [cerrandoSinActa, setCerrandoSinActa] = useState(false)

  // Cargar expediente
  const fetchExpediente = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setNotFound(false)

    try {
      // Expediente (crítico) + transiciones (no crítico) EN PARALELO — antes
      // iban en serie (2 round-trips encadenados, cada uno con su latencia).
      const [expedienteData, transicionesData] = await Promise.all([
        expedienteService.getExpedienteDetalle(id),
        expedienteService.getTransicionesDisponibles(id).catch(() => {
          console.warn('No se pudieron cargar las transiciones disponibles')
          // `null` = fallo. Con `[]` el boton "Cambiar estado" desaparecia y el
          // estudio se veia identico a "no tengo permiso para moverlo".
          return null
        }),
      ])
      setExpediente(expedienteData)
      setTransiciones(transicionesData)
      setCargas((n) => n + 1)
      expedienteCargadoRef.current = true
    } catch (err) {
      // Con el estudio ya en pantalla, un refresco que falla (red, límite de
      // peticiones) no la reemplaza por la de error: se avisa y queda lo último.
      if (expedienteCargadoRef.current) {
        toast.error('No se pudo actualizar el estudio; se muestra la última información.')
        return
      }
      if (err instanceof Error && err.message.includes('no encontrado')) {
        setNotFound(true)
      } else {
        const message = err instanceof Error ? err.message : 'Error al cargar el estudio'
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchExpediente()
  }, [fetchExpediente])

  // Pestaña con el número del estudio (varios estudios abiertos a la vez); se
  // pinta con <title> en el render principal.
  const numeroExpediente = expediente?.numero_expediente

  // Al firmar TODAS las partes, el expediente pasa a 'cerrado' en backend, pero
  // ese cierre es DIFERIDO (auto-heal disparado al listar contratos, que
  // onAllSigned ya hizo). Esperamos ~2.5s y re-consultamos el expediente UNA vez
  // para que el stepper avance a "Listo" sin que el usuario refresque. Se dispara
  // una sola vez (onAllSigned está guardado en FirmantesContratoSection), así que
  // no hay loop de refetch. Generar, regenerar, enviar a firma y cambiar de
  // estado también lo llaman: el Resumen oculto se refresca con esta carga.
  // El temporizador se guarda para cancelarlo al salir de la página (y para no
  // apilar recargas si llegan varios avisos seguidos: cuenta el último).
  const recargaDiferidaRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (recargaDiferidaRef.current) clearTimeout(recargaDiferidaRef.current)
  }, [])
  const handleContratoActualizado = useCallback(() => {
    if (recargaDiferidaRef.current) clearTimeout(recargaDiferidaRef.current)
    recargaDiferidaRef.current = setTimeout(() => {
      recargaDiferidaRef.current = null
      fetchExpediente()
    }, 2500)
  }, [fetchExpediente])

  // Ejecutar transición
  const handleEjecutarTransicion = async (
    estadoDestino: EstadoExpediente,
    comentario: string,
    etiqueta?: string,
    documentosConsultados?: string[],
    evaluacion?: IEvaluacionRevisionManual,
    motivo?: string,
    motivos?: IMotivosElegidos,
    condicionAdicional?: boolean,
    notaIdentidad?: string,
  ) => {
    setIsExecutingTransicion(true)
    try {
      const expedienteActualizado = await expedienteService.ejecutarTransicion(id, {
        estado_destino: estadoDestino,
        comentario,
        etiqueta,
        documentos_consultados: documentosConsultados,
        evaluacion,
        motivo,
        ...motivos,
        ...(condicionAdicional ? { condicion_adicional: true } : {}),
        ...(notaIdentidad ? { nota_identidad: notaIdentidad } : {}),
      })
      setExpediente(expedienteActualizado)

      // Recargar transiciones disponibles (no crítico)
      try {
        const nuevasTransiciones = await expedienteService.getTransicionesDisponibles(id)
        setTransiciones(nuevasTransiciones)
      } catch {
        setTransiciones(null)
      }

      toast.success('Estado actualizado correctamente')
    } catch (err) {
      // Sin acta de entrega no se cierra; Cofianza no la carga por la inmobiliaria,
      // pero un administrador puede cerrar sin ella (se cierra este modal y se pide el motivo).
      if (err instanceof ApiClientError && err.code === 'ACTA_ENTREGA_REQUERIDA' && user?.rol === 'administrador') {
        setMotivoCierre(comentario)
        setPedirCierreSinActa(true)
        return
      }
      // X13: la nota de identidad la pide el modal en línea; sin toast repetido.
      if (!(err instanceof ApiClientError && err.code === 'NOTA_IDENTIDAD_REQUERIDA')) {
        const message = err instanceof Error ? err.message : 'Error al cambiar el estado'
        toast.error(message)
      }
      throw err
    } finally {
      setIsExecutingTransicion(false)
    }
  }

  const handleCerrarSinActa = async (motivo: string) => {
    setCerrandoSinActa(true)
    try {
      setExpediente(await expedienteService.cerrarSinActa(id, motivo))
      try {
        setTransiciones(await expedienteService.getTransicionesDisponibles(id))
      } catch {
        setTransiciones(null)
      }
      setPedirCierreSinActa(false)
      toast.success('Estudio cerrado sin acta de entrega')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cerrar el estudio')
      // `false`: el diálogo sigue abierto con el motivo escrito.
      return false
    } finally {
      setCerrandoSinActa(false)
    }
  }

  // Asignar responsable
  const handleAsignarResponsable = async (analistaId: string) => {
    setIsAsignando(true)
    try {
      const expedienteActualizado = await expedienteService.asignarResponsable(id, analistaId)
      setExpediente(expedienteActualizado)
      toast.success('Responsable asignado correctamente')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al asignar responsable'
      toast.error(message)
      throw err
    } finally {
      setIsAsignando(false)
    }
  }

  // Igual que handleAsignarResponsable pero sin modal. Tragamos el error
  // porque aquel relanza para que el modal lo muestre, y aquí no hay modal.
  const tomarloYo = () => {
    if (!user) return
    handleAsignarResponsable(user.id).catch(() => {})
  }

  // Estado de carga: el skeleton de página solo la primera vez. Al recargar tras
  // una acción se sigue viendo el estudio (antes: ~2 s de página en blanco).
  if (isLoading && !expediente) {
    return <ExpedienteDetalleSkeleton />
  }

  // Estado 404
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <IconFolderOpen size={64} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Estudio no encontrado
        </h2>
        <p className="text-gray-500 mb-6">
          El estudio que busca no existe o fue eliminado.
        </p>
        <Link
          href={rutaListado}
          className="inline-block px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          {user?.rol === 'solicitante' ? 'Ver mis estudios' : 'Volver al listado'}
        </Link>
      </div>
    )
  }

  // Estado de error
  if (error || !expediente) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <IconAlertTriangle size={64} className="text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Error al cargar el estudio
        </h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={fetchExpediente}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          <IconRefresh size={18} />
          Reintentar
        </button>
      </div>
    )
  }

  const esCondicionado = expediente.estado === 'condicionado'

  const nombreAnalista = expediente.analista
    ? `${expediente.analista.nombre} ${expediente.analista.apellido}`.trim()
    : null
  // El contrato de OTRO estudio reservó el inmueble: aquí no se ofrece "Crear contrato".
  const reservadoPorOtro =
    expediente.inmueble?.estado === 'ocupado' &&
    !!expediente.inmueble.reservado_por_expediente_id &&
    expediente.inmueble.reservado_por_expediente_id !== id

  // Como la lista (etapaDeFila): la consulta fallida del coarrendatario va antes
  // del resultado y reintentarla es del gestor. El Resumen y la barra siguen la etapa real.
  const coaFallidaVive = coaFallido && !!etapa && etapa !== 'firma' && etapa !== 'firma_incompleta' && etapa !== 'vigente'
  const etapaTurno = coaFallidaVive ? 'fallida' : etapa
  // Un solo nombre para dónde está el estudio: el chip, la barra y el modal de cambio de estado.
  const etiquetaEtapa =
    user?.rol === 'solicitante'
      ? // El vocabulario de su barra y de rutas-resultado (no «Borrador» ni «Condicionado»).
        expediente.estado === 'borrador'
        ? 'En preparación'
        : expediente.estado === 'condicionado'
          ? condicionCoa
            ? condicionCoa.obligatoria ? 'Necesita un coarrendatario' : 'Está cerca'
            : // Ya cargado, lo revisa un analista: como su barra («Recibimos su paz y salvo»).
              pazYSalvo && !pazYSalvoRecibido ? 'Pendiente de un requisito' : 'En revisión'
          : undefined
      : coaFallidaVive
        ? 'Falló la consulta del coarrendatario'
        : etapa === 'decision' && condicionCoa
          ? condicionCoa.obligatoria ? 'Requiere coarrendatario' : 'Aprobado con condición'
          : etapa === 'decision' && pazYSalvo
            ? pazYSalvoRecibido
              ? // Como la lista (EstadoFila): a la inmobiliaria y al propietario sin nombrar el documento (§10).
                isInternalRole ? 'Paz y salvo cargado: por acreditar' : 'Requisito cargado: lo revisa Cofianza'
              : 'Requisito pendiente del candidato'
            : etapa
            ? ETAPA_LABEL[etapa]
            : undefined
  // En la espera, la franja ya dice que falta el coarrendatario: «Esperando al prospecto» la contradecía.
  const turno = etapaTurno && etapaTurno !== 'espera_coarrendatario' ? turnoDeEtapa(etapaTurno, esperaCandidato) : null
  const vistaTurno = isInternalRole ? 'cofianza' : puedeEditar ? 'gestor' : 'equipo'
  // Las mismas transiciones que ofrece el modal: con condición o con el paz y salvo
  // pendiente no se aprueba a mano (la API responde 409); no aprobarlo sí se ofrece.
  const transicionesModal = (transiciones ?? []).filter((t) => !(aprobacionCerrada && t.estado_destino === 'aprobado'))
  // Al dueño la API solo le ofrece cerrar o cancelar: el botón lo dice, y no como acción principal.
  const soloCierre = transicionesModal.every((t) => t.estado_destino === 'cerrado')

  return (
    <ExpedienteRefrescoContext.Provider value={cargas}>
    <div className="space-y-6" aria-busy={isLoading}>
      {/* Título de la pestaña: <title> de React 19 (va al <head>; al salir lo quita y queda el de la metadata). */}
      {numeroExpediente && <title>{`Estudio ${formatNumeroEstudio(numeroExpediente)} — Cofianza`}</title>}
      {/* Encabezado: qué estudio es y en qué está (título + estado), la ficha
          (inmueble, solicitante, pago, responsable) y la acción formal. */}
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2 sm:gap-3">
            <Link
              href={rutaListado}
              aria-label={user?.rol === 'solicitante' ? 'Volver a mis estudios' : 'Volver al listado'}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <IconArrowLeft size={20} />
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
              <h1 className="text-2xl font-bold leading-tight text-gray-900">
                Estudio {formatNumeroEstudio(expediente.numero_expediente)}
              </h1>
              {expediente.cancelado_at ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                  Cancelado
                </span>
              ) : (
                // Cerrado tras "no aprobable" no es "Finalizado" (eso lee a
                // éxito); y "Borrador" es jerga interna para el arrendatario.
                <Badge
                  estado={
                    expediente.estado === 'cerrado' && expediente.estado_pre_cancelacion === 'rechazado'
                      ? 'rechazado'
                      : expediente.estado
                  }
                  label={etiquetaEtapa}
                />
              )}
              {isLoading && (
                <span role="status" className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <IconLoader size={14} className="animate-spin" />
                  Actualizando…
                </span>
              )}
            </div>
          </div>

          {/* Acciones — el solicitante no cambia estado manualmente; un miembro
              con perfil incompleto tampoco hasta completar sus datos. */}
          {user?.rol !== 'solicitante' && !bloqueadoPorPerfil && (
            <div className="flex flex-wrap gap-3 pl-12 sm:pl-0">
              {transiciones === null ? (
                <Button variante="secondary" className="min-h-10" onClick={() => fetchExpediente()}>
                  <IconRefresh size={16} />
                  Reintentar acciones
                </Button>
              ) : transicionesModal.length > 0 ? (
                <Button variante="secondary" className="min-h-10" onClick={() => setShowTransicionModal(true)}>
                  {!soloCierre
                    ? 'Cambiar estado'
                    : transicionesModal.length === 1
                      ? transicionesModal[0].etiqueta
                      : 'Cerrar o cancelar el estudio'}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* Ficha: cada dato con su rótulo encima, en columnas que se leen de un vistazo. */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:ml-[52px] sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-4">
          {!expediente.inmueble && expediente.canon_objetivo_cop && (
            <Dato etiqueta="Inmueble" ancho>
              Por definir · canon de {formatCurrency(expediente.canon_objetivo_cop)}
            </Dato>
          )}
          {expediente.inmueble && (
            <Dato etiqueta="Inmueble" ancho>
              {expediente.inmueble.titulo || expediente.inmueble.direccion}
              {/* Flujo §11 "Reasignado": el estudio vino de otra propiedad (§4.3). */}
              {reasignadoDesde && (
                <span className="mt-1 flex">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Reasignado desde {reasignadoDesde}
                  </span>
                </span>
              )}
            </Dato>
          )}
          {expediente.solicitante && (
            <Dato etiqueta="Solicitante">
              {`${expediente.solicitante.nombre} ${expediente.solicitante.apellido}`.trim()}
            </Dato>
          )}
          {/* Gerencia no lee el pago; el prospecto tiene su propia tarjeta. */}
          {user && user.rol !== 'solicitante' && user.rol !== 'gerencia_consulta' && (expediente.estudio_habilitado ?? false) && (
            <LineaPagoEstudio
              expedienteId={id}
              estudioTitular={titular}
              gestor={
                !isInternalRole ? 'usted' : expediente.inmueble?.inmobiliaria_id ? 'la inmobiliaria' : 'el propietario'
              }
              deLaInmobiliaria={user.rol !== 'inmobiliaria'}
              version={cargas}
            />
          )}

          {/* Responsable ANALISTA interno (personal Cofianza). Solo lo asignan
              admin/operador, así que se muestra únicamente a roles internos.
              Para inmobiliaria/propietario el responsable relevante es el
              "Responsable del expediente" (miembro) del tab Resumen. */}
          {puedeAsignar && (
            <Dato
              ancho
              etiqueta={
                <span className="inline-flex items-center gap-1">
                  Responsable
                  <InfoTip texto={AYUDA.responsable} lado="izquierda" />
                </span>
              }
            >
              <span className="-my-1.5 flex flex-wrap items-center gap-x-3">
                {nombreAnalista ? (
                  <button
                    type="button"
                    onClick={() => setShowAsignacionModal(true)}
                    aria-label={`Responsable: ${nombreAnalista}. Cambiar responsable`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md text-gray-900 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <Avatar name={nombreAnalista} size="sm" />
                    <span>{nombreAnalista}</span>
                    <IconEdit size={14} className="text-gray-500" />
                  </button>
                ) : (
                  <>
                    <span className="font-normal text-gray-500">Sin asignar</span>
                    <button
                      type="button"
                      onClick={() => setShowAsignacionModal(true)}
                      className="inline-flex min-h-10 items-center gap-1 rounded-md text-primary-700 transition-colors hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <IconUser size={14} />
                      Asignar responsable
                    </button>
                  </>
                )}
                {/* Tomar el caso sin abrir el modal y buscarse en la lista de
                    analistas: es el 90% de las asignaciones reales. */}
                {user && expediente.analista?.id !== user.id && (
                  <button
                    type="button"
                    onClick={() => tomarloYo()}
                    disabled={isAsignando}
                    className="inline-flex min-h-10 items-center gap-1 rounded-md text-primary-700 transition-colors hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
                  >
                    <IconUserCheck size={14} />
                    {nombreAnalista ? 'Tomarlo yo' : 'Asignármelo'}
                  </button>
                )}
              </span>
            </Dato>
          )}
        </dl>
      </header>

      {/* Avance y turno: dónde está el estudio y a quién le toca. */}
      <section aria-label="Avance del estudio" className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <ExpedienteProgressBar
          expedienteId={id}
          estadoActual={expediente.estado}
          estadoPreCancelacion={expediente.estado_pre_cancelacion}
          // Sin inmueble no hay visita: la barra del prospecto la dejaba como paso actual.
          citaOmitida={expediente.cita_omitida || !expediente.inmueble}
          sinInfoBuro={condicionadoSinInfo}
          esProspecto={user?.rol === 'solicitante'}
          conCondicion={!!condicionCoa}
          condicionObligatoria={!!condicionCoa?.obligatoria}
          condicionDecideAnalista={!!condicionCoa?.decide_analista}
          requisitoPendienteHasta={pazYSalvo ? fechaCondicion(pazYSalvo.vence_en) : null}
          requisitoRecibido={pazYSalvoRecibido}
          etapa={user?.rol === 'solicitante' ? undefined : etapa}
          etiquetaActual={etiquetaEtapa}
        />
        {/* «Qué sigue»: de quién es el turno y el siguiente paso, con las palabras de la lista.
            Como la lista: lo propio en coral con flecha; el turno de otros, en gris. */}
        {etapaTurno && user?.rol !== 'solicitante' && (() => {
          const opcionesTurno = {
            revision: etapaTurno === 'decision' && !esperaCandidato,
            analista: puedeAsignar,
            sinEjecutar: etapaTurno === 'sin_ejecutar',
            pazYSalvoCargado: pazYSalvoRecibido,
            // Como en la lista: si otro analista ya la tomó, «En revisión de X» y sin coral.
            tomadoPor:
              etapaTurno === 'decision' && !esperaCandidato && puedeAsignar ? analistaAjeno(expediente.analista, user?.id) : null,
          }
          const propio = !!turno && turnoPropio(turno, vistaTurno, opcionesTurno)
          // L4: solo Cofianza ve cuánto lleva la revisión (desde las 24 h).
          const demora =
            isInternalRole && etapaTurno === 'decision' && !esperaCandidato
              ? // Con el paz y salvo cargado, la espera de Cofianza corre desde la carga.
                revisionDemorada(pazYSalvoCargadoEn ?? expediente.en_revision_desde, Date.now())
              : null
          // La decisión está en el Resumen: un atajo para llegar a ella desde cualquier pestaña.
          // Con la revisión tomada por otro, el atajo se conserva: un analista puede seguir decidiendo.
          const irADecision = (propio || !!opcionesTurno.tomadoPor) && etapaTurno === 'decision' && esCondicionado && puedeActuar
          return (
            <div
              className={`mt-5 flex flex-col gap-3 rounded-lg px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${
                propio ? 'bg-coral-50 ring-1 ring-inset ring-coral-200' : 'bg-gray-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                {turno && (
                  <p
                    className={`flex items-start gap-1.5 text-sm font-semibold ${propio ? 'text-coral-800' : 'text-gray-800'}`}
                  >
                    {propio && <IconArrowRight size={16} className="mt-0.5 shrink-0" />}
                    {textoTurno(turno, vistaTurno, opcionesTurno)}
                  </p>
                )}
                <p className={`text-sm leading-relaxed text-gray-700 ${turno ? 'mt-0.5' : ''} ${propio ? 'pl-[22px]' : ''}`}>
                  {queSigue(etapaTurno, {
                    vista: vistaTurno,
                    analista: puedeAsignar,
                    fechaCondicion: condicionCoa ? fechaCondicion(condicionCoa.vence_en) : null,
                    esperaHasta,
                    sinInmueble: !expediente.inmueble,
                    fechaPazYSalvo: pazYSalvo ? fechaCondicion(pazYSalvo.vence_en) : null,
                    pazYSalvoCargado: pazYSalvoRecibido,
                    // Propietario directo: la API no admite coarrendatario (espera el Convenio).
                  })}
                </p>
              </div>
              {(demora || irADecision) && (
                <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${propio ? 'pl-[22px] sm:pl-0' : ''}`}>
                  {demora && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${demora.tono === 'rojo' ? 'text-red-700' : 'text-amber-800'}`}
                    >
                      <IconClock size={14} className="shrink-0" />
                      {demora.texto}
                    </span>
                  )}
                  {irADecision && (
                    <Button
                      variante="secondary"
                      className="min-h-10"
                      onClick={() => {
                        setActiveTab('resumen')
                        requestAnimationFrame(() => {
                          const destino = document.getElementById('decision-estudio')
                          destino?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          destino?.focus({ preventScroll: true })
                        })
                      }}
                    >
                      {pazYSalvoRecibido ? 'Ir al paz y salvo' : 'Ir a la decisión'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </section>

      {/* Adenda de precios §7: canon sobre el tope — aviso al analista y excepción de la Gerencia General. */}
      {isInternalRole && expediente.tope_canon && (
        <ExcepcionTopeBlock expedienteId={id} tope={expediente.tope_canon} onAutorizada={fetchExpediente} />
      )}

      {/* Responsable del expediente (miembro) — SIEMPRE visible (en cualquier
          tab), solo inmobiliaria (Fase 3.1). El analista interno va en el header. */}
      {user?.rol === 'inmobiliaria' && (
        <ResponsableMiembroCard
          titulo="Responsable del estudio"
          ayuda='Si desactivó "los miembros ven todo", el responsable verá este estudio aunque el inmueble no sea suyo.'
          miembroResponsableId={expediente.miembro_responsable_id}
          onAssign={async (miembroId) => {
            await expedienteService.asignarMiembroResponsable(id, miembroId)
            setExpediente((prev) => (prev ? { ...prev, miembro_responsable_id: miembroId } : prev))
          }}
        />
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={cambiarTab} />

      {/* Contenido de tabs. Mientras se actualiza no se puede volver a pulsar
          una acción sobre datos que están por cambiar (doble clic). */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className={`${activeTab === 'resumen' ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'}${isLoading ? ' pointer-events-none' : ''}`}
      >
        {/* Tab: Resumen. Siempre montado (oculto en las otras pestañas): al
            volver no se desmontan y re-piden sus tarjetas. Se mantienen al día
            con el contador de cargas (fetchExpediente), no remontándose. */}
        <div className={user?.rol === 'solicitante' ? 'p-4 sm:p-6 space-y-6 bg-white rounded-xl shadow-sm border border-gray-200' : 'space-y-4'} hidden={activeTab !== 'resumen'}>
            {/* Banner del cierre del expediente — distinto si fue cancelado
                vs cierre natural vs rechazado. Aplica a todos los roles. */}
            {expediente.estado === 'rechazado' ||
            (user?.rol === 'solicitante' &&
              expediente.estado === 'cerrado' &&
              expediente.estado_pre_cancelacion === 'rechazado') ? (
              // Al prospecto, el cierre posterior a "no aprobable" se le sigue
              // diciendo "No aprobable por ahora" (§10/§13): la rama "Estudio
              // cerrado" de abajo le decía "rechazado" y le mostraba el motivo
              // interno del motor.
              <ExpedienteRechazadoBanner
                motivo={textoVisible(expediente.motivo_rechazo, { externo: !esRolInterno(user?.rol) })}
                esProspecto={user?.rol === 'solicitante'}
                apelacion={apelacionTitular}
                onReevaluar={
                  user?.rol === 'administrador' || user?.rol === 'operador_analista'
                    ? () => {
                        setActiveTab('estudios')
                        setPedidoReevaluar((n) => n + 1)
                      }
                    : undefined
                }
              />
            ) : expediente.estado === 'cerrado' && expediente.cancelado_at ? (
              <TarjetaSiguientePaso
                tono="alerta"
                icono={<IconX size={18} />}
                titulo="Estudio cancelado"
                descripcion={
                  <>
                    <p>El estudio fue cancelado y no continuará con el proceso.</p>
                    {expediente.motivo_cancelacion && (
                      <p className="mt-1">
                        <span className="font-semibold">Motivo:</span> {expediente.motivo_cancelacion}
                      </p>
                    )}
                  </>
                }
              />
            ) : expediente.estado === 'cerrado' && expediente.estado_pre_cancelacion === 'rechazado' ? (
              // rechazado→cerrado no escribe `cancelado_at` (no es abandono),
              // asi que sin esta rama caia en el "else" verde y saludaba con
              // "¡Estudio finalizado! Todos los pasos se completaron
              // exitosamente" a un candidato rechazado y sin contrato.
              <TarjetaSiguientePaso
                tono="neutro"
                icono={<IconX size={18} />}
                titulo="Estudio cerrado"
                descripcion={
                  <>
                    <p>El estudio no fue aprobable y el caso quedó cerrado.</p>
                    {textoVisible(expediente.motivo_rechazo, { externo: !esRolInterno(user?.rol) }) && (
                      <p className="mt-1">
                        <span className="font-semibold">Motivo:</span>{' '}
                        {textoVisible(expediente.motivo_rechazo, { externo: !esRolInterno(user?.rol) })}
                      </p>
                    )}
                  </>
                }
              />
            ) : expediente.estado === 'cerrado' && expediente.cierre_sin_acta ? (
              // Adenda 1 contratos (respuesta 21): no terminó «con todos los pasos»: un
              // administrador lo cerró sin el acta de entrega e inventario, con motivo.
              <TarjetaSiguientePaso
                tono="revision"
                icono={<IconAlertTriangle size={18} />}
                titulo="Estudio cerrado sin acta de entrega"
                descripcion={
                  <>
                    <p>
                      Lo cerró {expediente.cierre_sin_acta.porNombre ?? 'un administrador de Cofianza'} el{' '}
                      {formatDate(expediente.cierre_sin_acta.en)} sin el acta de entrega e inventario del contrato.
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold">Motivo:</span> {expediente.cierre_sin_acta.motivo}
                    </p>
                  </>
                }
              />
            ) : expediente.estado === 'cerrado' && (
              <TarjetaSiguientePaso
                tono="accion"
                icono={<IconCheck size={18} />}
                titulo="¡Estudio finalizado!"
                descripcion="Todos los pasos del proceso se completaron exitosamente. El estudio queda cerrado para consulta."
              />
            )}

            {/* "Siguiente paso" — solo para el solicitante, al tope.
                Tres bloques encadenados (cada uno se auto-oculta si no aplica):
                1) Pago del estudio (CTA "Pagar ahora" o "¡Pago confirmado!").
                2) Evaluación crediticia ("Confirma cédula" / "Consultando..." / resultado).
                3) Contrato ("Preparando contrato" / "Revisar y firmar" / "Activo"). */}
            {user?.rol === 'solicitante' && (
              <div className="space-y-4">
                <PagoEstudioSection
                  sinInmueble={!expediente.inmueble}
                  expedienteId={id}
                  userRole={user?.rol}
                  onPagoCompletado={fetchExpediente}
                  hideIfNoAction
                />
                <EstudioSolicitanteCard
                  expedienteId={id}
                  onEjecutado={fetchExpediente}
                  prefillTipoDocumento={expediente.solicitante?.tipo_documento ?? null}
                  prefillNumeroDocumento={expediente.solicitante?.numero_documento ?? null}
                  solicitanteTelefono={expediente.solicitante?.telefono ?? null}
                  sinInmueble={!expediente.inmueble}
                />
                <CoarrendatarioCard
                  expedienteId={id}
                  expedienteEstado={expediente.estado}
                  userRol={user?.rol}
                  onUpdate={fetchExpediente}
                  condicion={condicionCoa}
                  pazYSalvoPendiente={!!pazYSalvo}
                />
                <ContratoSolicitanteCard expedienteId={id} expedienteEstado={expediente.estado} />
              </div>
            )}

            {/* Propietario, inmobiliaria y Cofianza (revisión del Resumen, 23-oct):
                1) «Siguiente paso»: lo que toca ahora según la etapa del estudio;
                2) el detalle del paso actual;
                3) lo que ya pasó, plegado (autorización, pago, visita, coarrendatario).
                Las tarjetas se siguen ocultando solas si no aplican. Un miembro
                con el perfil incompleto ve las tarjetas sin las acciones. */}
            {user?.rol !== 'solicitante' && (
              <ResumenPorEtapa
                etapa={etapa}
                bloques={{
                  vincular:
                    puedeActuar && !expediente.inmueble && expediente.estado === 'aprobado' ? (
                      <TarjetaSiguientePaso
                        tono="revision"
                        icono={<IconBuilding2 size={18} />}
                        titulo="Siguiente paso: vincular el inmueble"
                        descripcion="El estudio está aprobado sin propiedad. Cuando la persona elija el inmueble, use «Vincular inmueble» en la evaluación de abajo; después podrá generar el contrato."
                      />
                    ) : null,
                  contrato:
                    puedeActuar && expediente.inmueble ? (
                      <AccionContratoPendienteCard
                        expedienteId={id}
                        expedienteEstado={expediente.estado}
                        userRol={user?.rol}
                        contratosV3={expediente.contratos_v3}
                        inmuebleReservadoPorOtro={reservadoPorOtro}
                        conComision={!!expediente.inmueble?.inmobiliaria_id}
                        onGenerated={fetchExpediente}
                      />
                    ) : null,
                  decision:
                    esCondicionado && puedeActuar ? (
                      // Destino del atajo «Ir a la decisión» de la franja del turno.
                      <div id="decision-estudio" tabIndex={-1} className="scroll-mt-4 rounded-xl focus:outline-none">
                      <AprobarCondicionadoCard
                        expedienteId={id}
                        expedienteEstado={expediente.estado}
                        userRol={user?.rol}
                        sinInfoBuro={condicionadoSinInfo}
                        estudioSinCentrales={estudioSinCentrales}
                        reconsultaParcial={reconsultaParcial}
                        condicion={condicionCoa}
                        canalPropietario={!expediente.inmueble?.inmobiliaria_id}
                        motivoRevision={titularCondicionado?.observaciones ?? null}
                        motivoRevisionCoarrendatario={titularCondicionado ? obsCoaRevision : null}
                        sinInmueble={!expediente.inmueble}
                        pazYSalvo={pazYSalvo}
                        adenda5Tramo={titularCondicionado?.adenda5_tramo ?? null}
                        onAprobado={fetchExpediente}
                      />
                      </div>
                    ) : null,
                  habilitar: puedeActuar ? (
                    <AccionHabilitarEstudioCard
                      expedienteId={id}
                      estudioHabilitado={expediente.estudio_habilitado ?? false}
                      estudioRechazado={expediente.estudio_rechazado}
                      citaOmitida={expediente.cita_omitida}
                      expedienteEstado={expediente.estado}
                      userRol={user?.rol}
                      onAction={fetchExpediente}
                    />
                  ) : null,
                  evaluacion: (
                    <EstudioEstadoCard
                      expedienteId={id}
                      onVerEstudios={() => setActiveTab('estudios')}
                      userRol={user?.rol}
                      solicitante={expediente.solicitante}
                      // Portabilidad §4.3: al llevar el estudio a otra propiedad cambia el
                      // inmueble del expediente; se recarga la página entera.
                      inmuebleActualId={expediente.inmueble?.id}
                      canonAprobado={expediente.estado === 'aprobado' ? (expediente.sin_inmueble?.canonAprobadoCop ?? null) : null}
                      destinacion={expediente.destinacion_objetivo ?? null}
                      onReasignado={fetchExpediente}
                      // Mismos guards de la API (reasignacion.service).
                      reasignable={
                        expediente.estado !== 'cerrado' &&
                        expediente.estado !== 'rechazado' &&
                        expediente.inmueble?.reservado_por_expediente_id !== id &&
                        (!!expediente.inmueble || expediente.estado === 'aprobado')
                      }
                      coarrendatarioVigente={coarrendatarioVigente}
                      expedienteEstado={expediente.estado}
                    />
                  ),
                  // §6.3: primero la autorización, después el cobro.
                  autorizacion:
                    expediente.estudio_habilitado ?? false ? (
                      <AutorizacionSection
                        expedienteId={id}
                        solicitanteEmail={expediente.solicitante?.email}
                        solicitanteTelefono={expediente.solicitante?.telefono}
                        solicitanteDocumento={expediente.solicitante ? expediente.solicitante.numero_documento ?? '' : undefined}
                        solicitanteTipoDocumento={expediente.solicitante?.tipo_documento}
                        solicitanteNombre={expediente.solicitante?.nombre}
                        solicitanteApellido={expediente.solicitante?.apellido}
                        onContactoActualizado={fetchExpediente}
                        soloLectura={!puedeActuar}
                        expedienteEstado={expediente.estado}
                      />
                    ) : null,
                  // Solo mientras el estudio no haya corrido (después pedir pago no tiene sentido).
                  pago:
                    puedeActuar &&
                    (expediente.estudio_habilitado ?? false) &&
                    !['en_revision', 'aprobado', 'condicionado', 'rechazado', 'cerrado'].includes(expediente.estado) ? (
                      <PagoEstudioSection
                        sinInmueble={!expediente.inmueble}
                        expedienteId={id}
                        userRole={user?.rol}
                        onPagoCompletado={fetchExpediente}
                        solicitanteNombre={`${expediente.solicitante?.nombre ?? ''} ${expediente.solicitante?.apellido ?? ''}`.trim()}
                        solicitanteEmail={expediente.solicitante?.email}
                        solicitanteTelefono={expediente.solicitante?.telefono}
                      />
                    ) : null,
                  contratoEstado: (
                    <ContratoEstadoCard
                      expedienteId={id}
                      onVerContratos={() => setActiveTab('contratos')}
                      cierreSinActa={expediente.cierre_sin_acta ?? null}
                    />
                  ),
                  coarrendatario: (
                    <CoarrendatarioPropietarioCard
                      expedienteId={id}
                      expedienteEstado={expediente.estado}
                      userRol={user?.rol}
                      // La ponderación puede mover el expediente sola al completar el
                      // estudio del coarrendatario: se recarga.
                      onEstudioCompletado={fetchExpediente}
                      requisitoPendiente={!!pazYSalvo}
                    />
                  ),
                  visita: expediente.inmueble ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                      <CitasSection
                        expedienteId={id}
                        expedienteEstado={expediente.estado}
                        citaOmitida={expediente.cita_omitida}
                        inmuebleId={expediente.inmueble?.id}
                        solicitanteId={expediente.solicitante?.id}
                        solicitanteTelefono={expediente.solicitante?.telefono}
                        onSolicitanteUpdated={fetchExpediente}
                        onCitaRealizada={fetchExpediente}
                      />
                    </div>
                  ) : null,
                }}
              />
            )}

            {/* El prospecto ve su cita arriba de los datos (al gestor se la ordena la etapa). */}
            {user?.rol === 'solicitante' && expediente.inmueble && (
            <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
              <CitasSection
                expedienteId={id}
                expedienteEstado={expediente.estado}
                citaOmitida={expediente.cita_omitida}
                inmuebleId={expediente.inmueble?.id}
                solicitanteId={expediente.solicitante?.id}
                solicitanteTelefono={expediente.solicitante?.telefono}
                onSolicitanteUpdated={fetchExpediente}
                onCitaRealizada={fetchExpediente}
              />
            </div>
            )}

            {/* Datos de consulta: al prospecto, a la vista; a quien gestiona, plegados al final. */}
            <DatosPlegables plegar={user?.rol !== 'solicitante'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sección Inmueble */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Inmueble
                </h3>
                {expediente.inmueble ? (
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Dirección" value={expediente.inmueble.direccion} />
                    <InfoRow
                      label="Ciudad"
                      value={`${expediente.inmueble.ciudad}, ${expediente.inmueble.departamento}`}
                    />
                    <InfoRow
                      label="Tipo"
                      value={TIPO_LABELS[expediente.inmueble.tipo as keyof typeof TIPO_LABELS] || expediente.inmueble.tipo}
                    />
                    {expediente.inmueble.uso && (
                      <InfoRow
                        label="Uso"
                        value={{ vivienda: 'Vivienda', mixto: 'Mixto', comercial: 'Comercio', local_comercial: 'Comercio' }[expediente.inmueble.uso] || expediente.inmueble.uso}
                      />
                    )}
                    {expediente.inmueble.estrato && (
                      <InfoRow label="Estrato" value={expediente.inmueble.estrato} />
                    )}
                    <InfoRow
                      label="Canon"
                      value={formatCurrency(expediente.inmueble.valor_arriendo)}
                      highlight
                    />
                    {expediente.inmueble.valor_administracion && (
                      <InfoRow
                        label="Administración"
                        value={formatCurrency(expediente.inmueble.valor_administracion)}
                      />
                    )}
                    {expediente.inmueble.area_construida && (
                      <InfoRow
                        label="Área"
                        value={`${expediente.inmueble.area_construida} m²`}
                      />
                    )}
                  </div>
                ) : expediente.canon_objetivo_cop ? (
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Inmueble" value="Por definir" />
                    <InfoRow
                      label="Destinación"
                      value={expediente.destinacion_objetivo === 'comercial' ? 'Comercial' : 'Vivienda'}
                    />
                    <InfoRow label="Canon objetivo" value={formatCurrency(expediente.canon_objetivo_cop)} />
                    {expediente.estado === 'aprobado' && expediente.sin_inmueble?.canonAprobadoCop && (
                      <InfoRow
                        label="Aprobado hasta"
                        value={formatCurrency(expediente.sin_inmueble.canonAprobadoCop)}
                        highlight
                      />
                    )}
                    <p className="text-xs text-gray-500">
                      {user?.rol === 'solicitante'
                        ? 'Cuando elija el inmueble, Cofianza lo vincula a su estudio.'
                        : puedeEditar && expediente.estado === 'aprobado'
                          ? 'Cuando la persona elija el inmueble, use «Vincular inmueble» en la evaluación.'
                          : 'El inmueble se vincula cuando el estudio quede aprobado.'}{' '}
                      La aprobación está sujeta a que el inmueble quede dentro del canon aprobado y a que el propietario
                      o la inmobiliaria firmen convenio con Cofianza.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin inmueble asociado</p>
                )}
              </div>

              {/* Sección Solicitante */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Solicitante
                </h3>
                {expediente.solicitante ? (
                  <div className="space-y-3 text-sm">
                    <InfoRow
                      label="Nombre"
                      value={`${expediente.solicitante.nombre} ${expediente.solicitante.apellido}`.trim()}
                    />
                    {expediente.solicitante.tipo_persona && (
                      <InfoRow
                        label="Tipo persona"
                        value={expediente.solicitante.tipo_persona === 'natural' ? 'Natural' : 'Jurídica'}
                      />
                    )}
                    <InfoRow
                      label="Documento"
                      value={documento(expediente.solicitante.tipo_documento, expediente.solicitante.numero_documento)}
                    />
                    {/* 3.1: si la persona tiene más de un expediente, avisarlo
                        de forma persistente (el toast de reutilización es
                        efímero). Busca por su documento en la lista. */}
                    {solicitanteExpCount !== null && solicitanteExpCount > 1 && (
                      <InfoRow
                        label="Estudios"
                        value={`${solicitanteExpCount} de esta persona · ver todos`}
                        href={`/expedientes?search=${encodeURIComponent(expediente.solicitante.numero_documento)}`}
                      />
                    )}
                    <InfoRow label="Correo" value={expediente.solicitante.email} />
                    {expediente.solicitante.telefono && (
                      <InfoRow label="Teléfono" value={expediente.solicitante.telefono} />
                    )}
                    {expediente.solicitante.ciudad && (
                      <InfoRow
                        label="Ciudad"
                        value={`${expediente.solicitante.ciudad}, ${expediente.solicitante.departamento || ''}`}
                      />
                    )}
                    {expediente.solicitante.ocupacion && (
                      <InfoRow label="Ocupación" value={expediente.solicitante.ocupacion} />
                    )}
                    {expediente.solicitante.ingresos_mensuales && (
                      <InfoRow
                        label="Ingresos"
                        value={formatCurrency(expediente.solicitante.ingresos_mensuales)}
                        highlight
                      />
                    )}
                    {expediente.solicitante.nivel_educativo && (
                      <InfoRow label="Nivel educativo" value={expediente.solicitante.nivel_educativo} />
                    )}
                    {expediente.solicitante.habitara_inmueble !== null && (
                      <InfoRow
                        label="Habitará el inmueble"
                        value={expediente.solicitante.habitara_inmueble ? 'Sí' : 'No'}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin solicitante asociado</p>
                )}
              </div>

              {/* Sección Expediente */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Datos del Estudio
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <InfoRow label="Fecha creación" value={formatDate(expediente.created_at)} />
                  {expediente.creador && (isInternalRole || user?.rol === 'inmobiliaria') && (
                    <InfoRow
                      label="Creado por"
                      value={`${expediente.creador.nombre} ${expediente.creador.apellido}`.trim()}
                    />
                  )}
                </div>
                {expediente.notas && user?.rol !== 'solicitante' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Notas del estudio</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {expediente.notas}
                    </p>
                  </div>
                )}
              </div>
            </div>
            </DatosPlegables>
        </div>

        {/* Tab: Documentos (HP-295). Montado desde el inicio (oculto) para que
            el contador de pendientes de la pestaña se vea sin tener que abrirla. */}
        {user?.rol !== 'solicitante' && (
          <div className="p-4 sm:p-6" hidden={activeTab !== 'documentos'}>
            <DocumentosSection
              key={visitasDocumentos}
              expedienteId={id}
              userRole={user?.rol}
              onPendientesChange={setPendientesCount}
            />
          </div>
        )}

        {/* Tab: Estudios */}
        {activeTab === 'estudios' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* El pago y la autorizacion viven en Resumen (§6.3): aqui se repetian
                las mismas tres tarjetas y la accion util quedaba enterrada. */}
            <p className="text-sm text-gray-500">
              La autorización del prospecto y el pago de la evaluación se gestionan en{' '}
              <button type="button" onClick={() => setActiveTab('resumen')} className="font-medium text-primary-700 underline">
                Resumen
              </button>
              .
            </p>
            <EstudiosSection
              expedienteId={id}
              solicitante={expediente.solicitante}
              onEstudioActualizado={fetchExpediente}
              coarrendatarioVigente={coarrendatarioVigente}
              pedidoReevaluar={pedidoReevaluar}
              onPedidoAtendido={pedidoAtendido}
            />

            {/* La decisión del condicionado vive en el Resumen (un solo lugar);
                aquí queda el coarrendatario, que es parte de la evaluación. */}
            {!bloqueadoPorPerfil && (
              <>
                <CoarrendatarioPropietarioCard
                  expedienteId={id}
                  expedienteEstado={expediente.estado}
                  userRol={user?.rol}
                  onEstudioCompletado={fetchExpediente}
                  requisitoPendiente={!!pazYSalvo}
                />
              </>
            )}
          </div>
        )}

        {/* Tab: Contratos */}
        {activeTab === 'contratos' && (
          <div className="p-4 sm:p-6">
            <ContratosSection
              expedienteId={id}
              expedienteEstado={expediente.estado}
              contratosV3={expediente.contratos_v3}
              sinInmueble={!expediente.inmueble}
              inmuebleReservadoPorOtro={reservadoPorOtro}
              conComision={!!expediente.inmueble?.inmobiliaria_id}
              onContratoActualizado={handleContratoActualizado}
            />
          </div>
        )}

        {/* Tab: Pagos (HP-351) */}
        {activeTab === 'pagos' && (
          <div className="p-4 sm:p-6">
            <PagosSection expedienteId={id} onPagoActualizado={fetchExpediente} />
          </div>
        )}

        {/* Tab: Comentarios (HP-263) */}
        {activeTab === 'comentarios' && (
          <div className="p-4 sm:p-6">
            <ComentariosSection expedienteId={id} />
          </div>
        )}

        {/* Tab: Timeline (HP-270) */}
        {activeTab === 'timeline' && (
          <div className="p-4 sm:p-6">
            <WhatsappMensajesSection expedienteId={id} />
            <TimelineSection expedienteId={id} />
          </div>
        )}
      </div>

      {/* Modal de transición */}
      <TransicionModal
        isOpen={showTransicionModal}
        onClose={() => setShowTransicionModal(false)}
        estadoActual={expediente.estado}
        transicionesDisponibles={transicionesModal}
        onConfirmar={handleEjecutarTransicion}
        isLoading={isExecutingTransicion}
        expedienteId={id}
        etiquetaActual={etiquetaEtapa}
      />

      <MotivoDialog
        // Se vuelve a montar con cada motivo: abre con el que el administrador ya escribió.
        key={motivoCierre}
        valorInicial={motivoCierre}
        isOpen={pedirCierreSinActa}
        onClose={() => setPedirCierreSinActa(false)}
        onConfirm={handleCerrarSinActa}
        title="¿Cerrar el estudio sin acta de entrega?"
        descripcion="El contrato no tiene el acta de entrega e inventario, y Cofianza no la carga en nombre de la inmobiliaria. Puede cerrar el estudio sin ella: el motivo queda registrado con su usuario y la fecha, y el riesgo de no tener acta es de la inmobiliaria. No se puede deshacer."
        label="Motivo del cierre sin acta"
        minLength={10}
        confirmLabel="Cerrar sin acta"
        variant="danger"
        isLoading={cerrandoSinActa}
      />

      {/* Modal de asignación de responsable */}
      <AsignacionResponsableModal
        isOpen={showAsignacionModal}
        onClose={() => setShowAsignacionModal(false)}
        expedienteId={id}
        analistaActual={expediente.analista}
        onAsignar={handleAsignarResponsable}
        isLoading={isAsignando}
      />
    </div>
    </ExpedienteRefrescoContext.Provider>
  )
}

// Componente helper para filas de información
function InfoRow({
  label,
  value,
  highlight = false,
  href,
}: {
  label: string
  value: string | number | null | undefined
  highlight?: boolean
  /** Si viene, el valor se vuelve enlace (evita copiar/pegar el dato a mano). */
  href?: string
}) {
  if (value === null || value === undefined) return null

  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 shrink-0">{label}:</span>
      {href ? (
        <Link href={href} className="min-w-0 break-words text-right font-semibold text-primary-700 hover:underline">
          {value}
        </Link>
      ) : (
        <span className={`min-w-0 break-words text-right ${highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
          {value}
        </span>
      )}
    </div>
  )
}

// Skeleton de carga
function ExpedienteDetalleSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-live="polite">
      <span className="sr-only">Cargando el estudio…</span>
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-8 w-40 bg-gray-200 rounded" />
            <div className="h-6 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="h-4 w-64 max-w-full bg-gray-200 rounded" />
          <div className="h-4 w-48 max-w-full bg-gray-200 rounded" />
        </div>
      </div>

      {/* Progress bar skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex justify-between">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="w-16 h-3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 shrink-0 bg-gray-200 rounded" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 sm:p-5">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Inmueble, solicitante y datos del estudio: plegados para quien gestiona (revisión del Resumen, 23-oct). */
function DatosPlegables({ plegar, children }: { plegar: boolean; children: ReactNode }) {
  if (!plegar) return <>{children}</>
  return (
    <Plegable titulo="Datos del estudio" resumen="Inmueble · Solicitante · Notas">
      <div className="p-4">{children}</div>
    </Plegable>
  )
}

/** Un dato de la ficha del encabezado: rótulo encima, valor debajo. */
function Dato({ etiqueta, ancho, children }: { etiqueta: ReactNode; ancho?: boolean; children: ReactNode }) {
  // `ancho`: en el celular ocupa las dos columnas (textos largos o con acciones).
  return (
    <div className={ancho ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="text-xs font-medium text-gray-500">{etiqueta}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-gray-900">{children}</dd>
    </div>
  )
}
