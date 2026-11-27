/**
 * Reportar Mora — módulo completo de 3 fases (Gerencia 12-may-2026,
 * mockup 13_*propietario.html). Reemplaza al stub anterior:
 *   - KPIs reales (reportadas mes / resueltas / en gestión / monto total)
 *   - Form de reporte (contrato + fecha vencimiento + monto + descripción)
 *   - Tabla con filter chips por fase
 *   - Modal de detalle con el historial del caso + acciones (escalar / marcar pagada / cancelar)
 */

'use client'

import { Modal } from '@/components/ui/Modal'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import {
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconLoader,
  IconX,
  IconChevronRight,
  IconEye,
  IconUpload,
} from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import {
  morasService,
  type IMoraTicket,
  type IMoraDetalle,
  type IMorasStats,
  type MoraEstado,
  type WhatsappEstado,
  type IDatosReporteMora,
  type ResultadoVerificacion,
} from '@/services/morasService'
import {
  avisoFueraDeVentana,
  avisoNotariaFormulario,
  chipReporte,
  CRONOGRAMA_MORA,
  escalaEn as escalaEnMora,
  estadoReporte,
  fechaDia,
  fechaDiaColombia,
  FRASE_VENTANA_REPORTE,
  motivoNoPaga,
  NOTA_MENSAJES_MORA,
  textoReporte,
} from '@/lib/reporteMora'
import { abrirEnPestana } from '@/lib/utils'
import { formatCurrency, fechaCompleta } from '@/lib/constants'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import { SearchInput } from '@/components/ui/SearchInput'
import { useAuthStore } from '@/stores/auth.store'
import { ApiClientError } from '@/lib/api'
import { formatNumeroEstudio } from '@/lib/utils'
import { fechaCorta } from '@/components/dashboard/secciones/_shared'
import { ListaDiferidos } from '@/components/migracion/Diferidos'

interface ContratoSelectItem {
  id: string
  numero: string
  inquilino: string
  monto: number
}

const FASE_CONFIG: Record<MoraEstado, { label: string; chip: string; chipText: string; bdot: string }> = {
  fase_1: {
    label: 'Fase 1 — Recordatorio',
    chip: 'bg-amber-50 border-amber-200',
    chipText: 'text-amber-700',
    bdot: 'bg-amber-500',
  },
  fase_2: {
    label: 'Fase 2 — Urgencia',
    chip: 'bg-coral-50 border-coral-200',
    chipText: 'text-coral-700',
    bdot: 'bg-coral-500',
  },
  fase_3: {
    label: 'Fase 3 — Legal',
    chip: 'bg-red-50 border-red-200',
    chipText: 'text-red-700',
    bdot: 'bg-red-500',
  },
  pagada: {
    label: 'Pagada',
    chip: 'bg-primary-50 border-primary-200',
    chipText: 'text-primary-700',
    bdot: 'bg-primary-500',
  },
  cancelada: {
    label: 'Cancelada',
    chip: 'bg-gray-100 border-gray-200',
    chipText: 'text-gray-600',
    bdot: 'bg-gray-400',
  },
}

// El toast decía «se notificó al inquilino vía WhatsApp» aunque no tuviera
// teléfono o Meta rechazara el envío: se dice lo que pasó de verdad.
const FALLO_WHATSAPP: Record<Exclude<WhatsappEstado, 'aceptado' | 'programado'>, string> = {
  sin_telefono: 'no se pudo avisar al inquilino por WhatsApp porque no tiene teléfono registrado. Avísele por otro medio.',
  fallido: 'el WhatsApp al inquilino falló. Avísele por otro medio.',
  mock: 'el WhatsApp está en modo de prueba y no se envió al inquilino.',
  // Ley 2300 con el envío automático apagado: no se promete hora.
  retenido:
    'el WhatsApp al inquilino quedó en espera por el horario de cobranza y el envío automático está apagado: no sale hasta que lo enciendan. Si es urgente, avísele por otro medio dentro del horario.',
}

function avisarResultado(
  accion: string,
  r: { whatsapp_estado?: WhatsappEstado; whatsapp_programado_para?: string | null; cobro_por_correo?: boolean },
) {
  const estado = r.whatsapp_estado
  if (estado === 'fallido' && r.cobro_por_correo) {
    // El cobro ya salió por correo en lugar del WhatsApp: pedir «otro medio»
    // invitaba a un segundo contacto de cobro el mismo día (Ley 2300).
    toast.success(`${accion}. El WhatsApp no salió; se le envió el cobro al inquilino por correo electrónico.`)
  } else if (estado === 'programado') {
    // Ley 2300: fuera del horario de cobranza (o antes de 7 días desde el último
    // WhatsApp de cobro al inquilino) el WhatsApp espera; no se pierde.
    const cuando = r.whatsapp_programado_para
      ? `el ${new Date(r.whatsapp_programado_para).toLocaleString('es-CO', {
          timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
        })}`
      : 'en el siguiente horario permitido'
    toast.success(`${accion}. El WhatsApp al inquilino sale ${cuando}: la ley pide el horario de cobranza y 7 días entre un WhatsApp de cobro y el siguiente.`)
  } else if (!estado || estado === 'aceptado') {
    toast.success(`${accion}. Se envió el WhatsApp al inquilino.`)
  } else {
    toast.warning(`${accion}, pero ${FALLO_WHATSAPP[estado]}`)
  }
}

// 'por_verificar' = la cola de Operaciones (Adenda 6.1 §4): reportes de contratos en notaría con el contrato
// autenticado cargado, por verificar. Solo la ve Cofianza.
type FiltroMoras = 'todas' | 'activas' | MoraEstado | 'por_verificar'

const FILTROS: Array<{ key: FiltroMoras; label: string; soloInterno?: boolean }> = [
  { key: 'activas', label: 'Activas' },
  { key: 'por_verificar', label: 'Por verificar', soloInterno: true },
  { key: 'todas', label: 'Todas' },
  { key: 'fase_1', label: 'Fase 1' },
  { key: 'fase_2', label: 'Fase 2' },
  { key: 'fase_3', label: 'Fase 3' },
  { key: 'pagada', label: 'Pagadas' },
]

const TONO_CHIP: Record<'amber' | 'gray' | 'red', string> = {
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  gray: 'bg-gray-100 border-gray-200 text-gray-700',
  red: 'bg-red-50 border-red-200 text-red-700',
}

// useSearchParams necesita un Suspense por encima (si no, la build falla al
// prerenderizar la página).
export default function ReportarMoraPage() {
  return (
    <Suspense fallback={null}>
      <ReportarMora />
    </Suspense>
  )
}

function ReportarMora() {
  const searchParams = useSearchParams()
  // Llega desde la tarjeta del inmueble (?contrato_id=).
  const contratoIdUrl = searchParams.get('contrato_id') ?? ''
  // La pantalla estaba escrita para el propietario ("Avisa a Cofianza…"), pero
  // quien más la usa es el operador de Cofianza: para él esto es una cola de
  // gestión, no un formulario de aviso.
  const rol = useAuthStore((s) => s.user?.rol)
  const esInterno = rol === 'administrador' || rol === 'operador_analista'
  const puedeEditarPagina = usePuedeEditar()
  const [stats, setStats] = useState<IMorasStats | null>(null)
  const [moras, setMoras] = useState<IMoraTicket[]>([])
  const [contratos, setContratos] = useState<ContratoSelectItem[]>([])
  // "No hay contratos vigentes para reportar" es una afirmacion categorica, y
  // se pintaba tambien cuando la peticion fallaba — en el arranque de cobranza,
  // con el boton ya deshabilitado, o sea el camino cortado antes de empezar.
  const [falloContratos, setFalloContratos] = useState(false)
  const [totalContratos, setTotalContratos] = useState(0)
  const [filtroContrato, setFiltroContrato] = useState('')
  // El operador arranca en la cola (activas): «Todas» suma pagadas y canceladas.
  const [filtro, setFiltro] = useState<FiltroMoras>(esInterno ? 'activas' : 'todas')
  const [totalMoras, setTotalMoras] = useState(0)
  const [loading, setLoading] = useState(true)
  // Si la carga falla no se puede decir «Aún no hay moras» ni pintar KPI en 0:
  // el operador creía que la cola estaba vacía y ese día no escalaba nada.
  const [falloCarga, setFalloCarga] = useState(false)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  // `reportando` es la bandera de "enviando", nada mas. Arrancaba en true cuando
  // la URL traia ?contrato_id=, asi que llegar desde la tarjeta del inmueble
  // abria el formulario con el boton ya bloqueado en "Reportando…"; solo vuelve
  // a false en el finally de handleReportar, que nunca corria porque el boton
  // estaba disabled. Quien abre el <details> del deep link es deepLinkContrato,
  // doce lineas mas abajo.
  const [reportando, setReportando] = useState(false)

  // Form state
  // Llega desde la tarjeta del inmueble (?contrato_id=): evita volver a
  // elegir el contrato en un selector de todos.
  const [contratoId, setContratoId] = useState(contratoIdUrl)
  // Deep link desde la tarjeta del inmueble (?contrato_id=): el formulario
  // tiene que abrirse aunque para el operador vaya plegado por defecto.
  const [deepLinkContrato] = useState(() => !!contratoIdUrl)
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // Hoy en Colombia (YYYY-MM-DD): un canon que aún no vence no está en mora.
  const [hoy] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }))
  // Reporte de la Oficina Virtual (punto 2): al elegir el contrato, la API dice el canon, la fecha de pago pactada del
  // mes en curso (V3: día 1; plantilla anterior: día 5) y si es de notaría. La pantalla no calcula nada de eso.
  const [datosContrato, setDatosContrato] = useState<IDatosReporteMora | null>(null)
  const [cargandoDatos, setCargandoDatos] = useState(false)
  const [falloDatos, setFalloDatos] = useState(false)
  const pedidoDatos = useRef(0)
  // Adenda 6.1 §4: el contrato autenticado de un contrato en notaría (se carga después de crear la mora).
  const [archivoNotaria, setArchivoNotaria] = useState<File | null>(null)
  const [confirmarIncompleto, setConfirmarIncompleto] = useState(false)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setFalloCarga(false)
    try {
      const [statsRes, morasRes] = await Promise.all([
        morasService.stats(),
        // El operador atiende primero lo más viejo: el API ordena y corta, así
        // las 100 que llegan son las más viejas y no las más recientes.
        morasService.list(
          filtro === 'por_verificar'
            ? { estado: 'activas', reporte: 'por_verificar', limit: 100, orden: 'asc' }
            : { estado: filtro, limit: 100, orden: esInterno ? 'asc' : 'desc' },
        ),
      ])
      setStats(statsRes)
      setMoras(morasRes.data)
      setTotalMoras(morasRes.pagination.total)
    } catch {
      setFalloCarga(true)
      setMoras([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [filtro, esInterno])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Canon, fecha pactada y notaría del contrato elegido (la API es la única fuente). Si llega tarde (se eligió otro
  // contrato), se descarta. Sin respuesta, el monto sale del listado y la fecha se escribe a mano.
  const cargarDatosContrato = useCallback(async (id: string, montoListado?: number) => {
    const pedido = ++pedidoDatos.current
    setDatosContrato(null)
    setFalloDatos(false)
    setArchivoNotaria(null)
    if (!id) return
    setCargandoDatos(true)
    try {
      const d = await morasService.datosReporte(id)
      if (pedido !== pedidoDatos.current) return
      setDatosContrato(d)
      setMonto(String(d.canon ?? montoListado ?? ''))
      setFechaVencimiento(d.fecha_vencimiento)
    } catch {
      if (pedido !== pedidoDatos.current) return
      setFalloDatos(true)
      if (montoListado) setMonto(String(montoListado))
      setFechaVencimiento('')
    } finally {
      if (pedido === pedidoDatos.current) setCargandoDatos(false)
    }
  }, [])

  // Contratos firmados o vigentes para el dropdown (los que la API acepta para reportar; un registro en notaría del
  // flujo anterior puede quedar «firmado» si su activación no terminó) — separado del refresh principal.
  useEffect(() => {
    contratoService
      .getAllContratos({ estado: 'vigente,firmado', limit: 100 })
      .then((res) => {
        // El listado embebe expedientes.solicitantes + inmuebles.codigo, así
        // que mostramos arrendatario + código del inmueble (auto-llenado).
        const items: ContratoSelectItem[] = res.data.map((c) => {
          const sol = c.expedientes?.solicitantes
          const inquilino = sol ? `${sol.nombre ?? ''} ${sol.apellido ?? ''}`.trim() : ''
          return {
            id: c.id,
            numero: c.expedientes?.inmuebles?.codigo || (c.expedientes?.numero ? `Estudio ${formatNumeroEstudio(c.expedientes.numero)}` : c.id.slice(0, 8)),
            inquilino: inquilino || '—',
            monto: c.valor_arriendo ?? 0,
          }
        })
        setContratos(items)
        // Deep link: el contrato que vino en la URL trae su canon y su fecha pactada.
        // Aunque no esté entre los primeros 100: la API responde por el contrato (o 404 si no es de su cartera).
        const delEnlace = contratoIdUrl ? items.find((c) => c.id === contratoIdUrl) : undefined
        if (contratoIdUrl) void cargarDatosContrato(contratoIdUrl, delEnlace?.monto)
        setTotalContratos(res.meta.total)
        setFalloContratos(false)
      })
      .catch(() => { setContratos([]); setFalloContratos(true) })
  }, [contratoIdUrl, cargarDatosContrato])

  // El select traía 100 contratos sin forma de buscar: encontrar el correcto
  // era ir bajando a ojo.
  const contratosFiltrados = filtroContrato
    ? contratos.filter((c) =>
        `${c.numero} ${c.inquilino}`.toLowerCase().includes(filtroContrato.toLowerCase()),
      )
    : contratos

  const contratoSeleccionado = contratos.find((c) => c.id === contratoId)
  // Al elegir el contrato: monto = canon (editable) y fecha = la de pago pactada del mes en curso.
  const elegirContrato = (id: string) => {
    setContratoId(id)
    void cargarDatosContrato(id, contratos.find((c) => c.id === id)?.monto)
  }
  // Adenda 6.1 §4: contrato en notaría sin el contrato autenticado cargado. El operador no lo carga (lo custodia la
  // inmobiliaria o el propietario; el administrador sí puede).
  const notariaSinDocumento =
    !!datosContrato?.notaria && !datosContrato.notaria.documento_cargado && datosContrato.notaria.fecha_en_rango !== false
  // Contrato V3: el contrato autenticado lo carga la inmobiliaria (la API se lo niega al propietario).
  const cargaLaInmobiliaria = rol === 'propietario' && datosContrato?.notaria?.carga_inmobiliaria === true
  const puedeCargarDocumento = rol !== 'operador_analista' && !cargaLaInmobiliaria

  async function handleReportar(e: React.FormEvent) {
    e.preventDefault()
    if (fechaVencimiento && !fechaCompleta(fechaVencimiento)) {
      toast.error('Fecha de vencimiento inválida')
      return
    }
    if (!contratoId) {
      toast.error('Seleccione un contrato')
      return
    }
    const montoNum = Number(monto.replace(/\D/g, ''))
    if (!montoNum) {
      toast.error('Monto inválido')
      return
    }
    // El formulario exige el contrato autenticado: sin él se pide confirmar que el reporte queda incompleto.
    if (notariaSinDocumento && puedeCargarDocumento && !archivoNotaria) {
      setConfirmarIncompleto(true)
      return
    }
    await enviarReporte(montoNum)
  }

  async function enviarReporte(montoNum: number) {
    setReportando(true)
    try {
      const creada = await morasService.reportar({
        contrato_id: contratoId,
        fecha_vencimiento_canon: fechaVencimiento,
        monto_mora: montoNum,
        descripcion: descripcion.trim() || undefined,
      })
      avisarResultado(esInterno ? 'Mora registrada' : 'Mora reportada a Cofianza', creada)
      // Adenda 6.1 §4: el contrato autenticado va después de crear la mora (queda en el contrato, una sola vez).
      let reporte = estadoReporte(creada)
      if (reporte === 'incompleto' && archivoNotaria) {
        try {
          const conDocumento = await morasService.cargarDocumentoNotaria(creada.id, archivoNotaria)
          reporte = estadoReporte(conDocumento)
        } catch (err) {
          const detalle = err instanceof Error && err.message ? `: ${err.message}` : '.'
          toast.error(`La mora quedó reportada, pero el contrato autenticado no quedó presentado${detalle}`, { duration: 12000 })
        }
      }
      if (reporte === 'completo' && creada.plazo_pago_hasta) {
        toast.info(
          creada.reporte_en_ventana === false
            ? 'Reporte completo, fuera de la ventana del día 6 al 10: Cofianza revisa si cubre esta mora.'
            : `Reporte completo: Cofianza paga a más tardar el ${fechaDia(creada.plazo_pago_hasta)}.`,
          { duration: 10000 },
        )
      } else if (reporte === 'por_verificar') {
        toast.info('Cofianza verifica el contrato autenticado. Si lo confirma, el reporte queda completo desde hoy.', { duration: 10000 })
      } else if (reporte === 'incompleto' && !archivoNotaria) {
        toast.warning(
          puedeCargarDocumento
            ? 'Reporte incompleto: cargue el contrato autenticado desde el detalle de la mora para que empiece a correr el plazo de pago.'
            : cargaLaInmobiliaria
              ? 'Reporte incompleto: el contrato autenticado de este contrato lo carga la inmobiliaria. El plazo de pago empieza cuando lo cargue.'
              : 'Reporte incompleto: le avisamos a la inmobiliaria o al propietario para que cargue el contrato autenticado.',
          { duration: 12000 },
        )
      } else if (reporte === 'no_paga') {
        toast.warning('La fecha de autenticación registrada no está dentro del rango: Cofianza no paga esta mora.', { duration: 12000 })
      }
      // Contrato migrado (Adenda 1 §3): la mora le pide a la inmobiliaria lo que no se pidió al migrar.
      // Quien la reporta suele ser la inmobiliaria: a ella se le dice qué entregar, no «se le pidieron a la inmobiliaria».
      if (creada.diferidos?.items.some((i) => i.pendiente) && creada.diferidos.vence_en) {
        const plazo = fechaCorta(creada.diferidos.vence_en)
        const faltan = creada.diferidos.items
          .filter((i) => i.pendiente)
          .map((i) => i.etiqueta.charAt(0).toLowerCase() + i.etiqueta.slice(1))
          .join('; ')
        toast.info(
          esInterno
            ? `Contrato migrado: se le pidieron a la inmobiliaria los datos que faltan, con plazo hasta el ${plazo}.`
            : `Contrato migrado: entregue a Cofianza, a más tardar el ${plazo}, lo que no se pidió al migrar: ${faltan}.`,
          { duration: 12000 },
        )
      }
      setContratoId('')
      setMonto('')
      setDescripcion('')
      setFechaVencimiento('')
      void cargarDatosContrato('')
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reportar la mora')
    } finally {
      setReportando(false)
    }
  }

  // Para el operador esto es una cola de gestión: el formulario de reporte
  // le comía la mitad superior de la pantalla y empujaba la cola hacia abajo,
  // así que lo dejamos plegado y detrás de la tabla.
  const formularioReporte = (
    <details open={!esInterno || deepLinkContrato} className="bg-white rounded-xl border border-gray-200">
      <summary className="cursor-pointer px-4 sm:px-5 py-4 text-sm font-bold text-gray-900 marker:text-gray-400">
        {esInterno ? 'Registrar mora manualmente' : 'Reportar una mora'}
      </summary>
      <div className="px-4 sm:px-5 pb-5">
      <form onSubmit={handleReportar} className="space-y-4">
        {/* Reporte de la Oficina Virtual, punto 2: la frase va literal, antes del formulario. */}
        <p className="text-sm font-semibold text-gray-900">{FRASE_VENTANA_REPORTE}</p>
        {avisoFueraDeVentana(hoy) && <p className="-mt-2 text-xs text-amber-700">{avisoFueraDeVentana(hoy)}</p>}
        {/* Un solo cronograma (el de las fases, como lo ejecuta la API); la regla de los WhatsApp, aparte. */}
        <div className="flex items-start gap-3 bg-primary-50 border-l-4 border-primary-500 rounded-r-lg p-3 text-sm text-primary-900">
          <IconAlertTriangle size={18} className="text-primary-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold">Cómo sigue el caso</p>
            <ul className="mt-1 space-y-0.5">
              {CRONOGRAMA_MORA.map((p) => (
                <li key={p.cuando}>
                  <strong>{p.cuando}:</strong> {p.que}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-primary-800">{NOTA_MENSAJES_MORA}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="moras-contrato" className="block text-sm font-medium text-gray-700 mb-1">
              Contrato <span className="text-coral-700">*</span>
            </label>
            {/* El filtro vive dentro del formulario de reporte: sin esto, un
                Enter mientras se busca el contrato enviaba la mora a medias. */}
            <div onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
              <SearchInput
                placeholder="Filtrar por código o inquilino"
                onSearch={setFiltroContrato}
                className="mb-2"
              />
            </div>
            <select
              id="moras-contrato"
              value={contratoId}
              onChange={(e) => elegirContrato(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">— Seleccione contrato —</option>
              {contratosFiltrados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero}
                  {c.inquilino !== '—' ? ` — ${c.inquilino}` : ''} · {formatCurrency(c.monto)}
                </option>
              ))}
            </select>
            {falloContratos ? (
              <p className="text-xs text-amber-600 mt-1">
                No se pudo cargar la lista de contratos. Recargue la página para reintentar.
              </p>
            ) : contratos.length === 0 ? (
              <p className="text-xs text-amber-600 mt-1">
                No hay contratos firmados o vigentes para reportar
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {contratosFiltrados.length} contrato{contratosFiltrados.length === 1 ? '' : 's'}
                {totalContratos > contratos.length && ' · solo se listan los primeros 100; use el filtro'}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="moras-fecha-de-vencimiento-del-canon" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de vencimiento del canon <span className="text-coral-700">*</span>
            </label>
            <input id="moras-fecha-de-vencimiento-del-canon"
              type="date"
              max={hoy}
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              aria-describedby="moras-fecha-ayuda"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              required
            />
            <p id="moras-fecha-ayuda" className="text-xs text-gray-500 mt-1" aria-live="polite">
              {!contratoId
                ? 'Se llena con la fecha de pago del contrato al elegirlo.'
                : cargandoDatos
                  ? 'Buscando la fecha de pago del contrato…'
                  : falloDatos
                    ? 'No pudimos traer la fecha de pago del contrato: escríbala.'
                    : datosContrato?.explicacion_fecha}
            </p>
          </div>
        </div>

        {/* Adenda 6.1 §4: contrato con firma en notaría. */}
        {datosContrato?.notaria && (() => {
          const avisoBase = avisoNotariaFormulario(datosContrato.notaria)
          // Contrato V3 visto por el propietario: no se le pide cargarlo (lo carga la inmobiliaria; lo dice el párrafo de abajo).
          const aviso =
            cargaLaInmobiliaria && notariaSinDocumento
              ? {
                  ...avisoBase,
                  texto:
                    'Contrato con firma en notaría: sin el contrato autenticado (PDF) el reporte queda incompleto, no empieza a correr el plazo de pago y el caso no pasa a Fase 3. Si no se presenta, Cofianza no paga.',
                }
              : avisoBase
          return (
            <div className={cn('rounded-lg border p-3 text-sm space-y-2', TONO_CHIP[aviso.tono])}>
              <p role="status" aria-live="polite">{aviso.texto}</p>
              {notariaSinDocumento && (
                puedeCargarDocumento ? (
                  <div>
                    <label htmlFor="moras-contrato-notaria" className="block text-sm font-medium text-gray-800 mb-1">
                      Contrato autenticado en notaría (PDF, hasta 20 MB) <span className="text-coral-700">*</span>
                    </label>
                    <input
                      id="moras-contrato-notaria"
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        if (f && (f.type !== 'application/pdf' || f.size > 20 * 1024 * 1024)) {
                          toast.error('El contrato autenticado debe ser un PDF de hasta 20 MB.')
                          e.target.value = ''
                          setArchivoNotaria(null)
                          return
                        }
                        setArchivoNotaria(f)
                      }}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-50"
                    />
                  </div>
                ) : cargaLaInmobiliaria ? (
                  <p className="text-xs">
                    El contrato autenticado de este contrato lo carga la inmobiliaria. Hasta que lo cargue, el reporte queda incompleto y no
                    empieza a correr el plazo de pago.
                  </p>
                ) : (
                  <p className="text-xs">Al registrar la mora le avisamos a la inmobiliaria o al propietario para que cargue el contrato autenticado desde el detalle de la mora.</p>
                )
              )}
            </div>
          )
        })()}

        {/* Datos auto-llenados del contrato seleccionado (mockup 13_v2). */}
        {contratoId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="moras-inquilino" className="block text-sm font-medium text-gray-700 mb-1">Inquilino</label>
              <input id="moras-inquilino"
                type="text"
                readOnly
                value={contratoSeleccionado?.inquilino ?? '—'}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg text-sm"
              />
            </div>
            <div>
              <label htmlFor="moras-fecha-del-reporte-hoy" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del reporte <span className="text-gray-500 font-normal">(hoy)</span>
              </label>
              <input id="moras-fecha-del-reporte-hoy"
                type="text"
                readOnly
                value={new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="moras-monto-en-mora" className="block text-sm font-medium text-gray-700 mb-1">
              Monto en mora <span className="text-coral-700">*</span>
            </label>
            <input id="moras-monto-en-mora"
              type="text"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              placeholder="1200000"
              required
            />
            {monto && (
              <p className="text-xs text-gray-500 mt-1">{formatCurrency(Number(monto))}</p>
            )}
          </div>
          <div>
            <label htmlFor="moras-descripcion-opcional" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <input id="moras-descripcion-opcional"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: No respondió mensajes esta semana"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={reportando || cargandoDatos || !contratoId || !monto}
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-5 py-2.5 text-sm font-bold text-ink-900 bg-coral-500 hover:bg-coral-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            {reportando ? <IconLoader size={16} className="animate-spin" /> : <IconAlertTriangle size={16} />}
            {reportando ? 'Reportando…' : esInterno ? 'Registrar mora' : 'Reportar a Cofianza'}
          </button>
        </div>
      </form>
      </div>
      <ConfirmDialog
        isOpen={confirmarIncompleto}
        onClose={() => setConfirmarIncompleto(false)}
        onConfirm={async () => {
          setConfirmarIncompleto(false)
          await enviarReporte(Number(monto.replace(/\D/g, '')))
        }}
        isLoading={reportando}
        variant="danger"
        title="Reportar sin el contrato autenticado"
        message="Sin el contrato autenticado en notaría el reporte queda incompleto: no empieza a correr el plazo de pago de Cofianza y el caso no pasa a Fase 3. Puede cargarlo después desde el detalle de la mora."
        confirmLabel="Reportar incompleto"
        cancelLabel="Volver y cargarlo"
      />
    </details>
  )

  const tablaMoras = (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-5 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <div className="mr-auto min-w-0">
          <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-coral-500" />
            Seguimiento de moras
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Haga clic en una fila o en el ticket para ver el detalle y el historial del caso.
            {esInterno && ' Ordenadas de más antigua a más reciente.'}
            {!loading && totalMoras > moras.length && ` Mostrando ${moras.length} de ${totalMoras}.`}
          </p>
        </div>
        <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 sm:pb-0">
        {FILTROS.filter((f) => !f.soloInterno || esInterno).map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filtro === f.key}
            onClick={() => setFiltro(f.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-2 sm:py-1 text-xs font-bold transition-colors ${
              filtro === f.key
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary-600'
            }`}
          >
            {f.key in FASE_CONFIG && (
              <span className={`h-1.5 w-1.5 rounded-full ${FASE_CONFIG[f.key as MoraEstado].bdot}`} />
            )}
            {f.label}
          </button>
        ))}
        </div>
      </div>

      {loading && moras.length === 0 ? (
        <SkeletonTable filas={5} columnas={7} etiqueta="Cargando moras…" className="rounded-none border-0" />
      ) : falloCarga ? (
        <div className="p-8 text-center bg-amber-50">
          <p className="font-semibold text-amber-900 text-sm">No se pudieron cargar las moras</p>
          <p className="text-sm text-amber-800 mt-1">Esto no significa que no haya moras en gestión.</p>
          <button
            type="button"
            onClick={cargarDatos}
            className="mt-4 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Reintentar
          </button>
        </div>
      ) : moras.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          {filtro === 'todas'
            ? 'Aún no hay moras reportadas. Cuando reporte una aparecerá aquí.'
            : filtro === 'activas'
              ? 'No hay moras en gestión.'
              : filtro === 'por_verificar'
                ? 'No hay contratos autenticados en notaría por verificar.'
                : 'Sin resultados para este filtro.'}
        </div>
      ) : (
        <div className={cn('overflow-x-auto transition-opacity', loading && 'pointer-events-none opacity-60')} aria-busy={loading}>
        <table className="w-full min-w-max text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Ticket
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Inquilino
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Inmueble
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Monto
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Días
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Escala en
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Coa.
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Fase
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">
                Estudio
              </th>
            </tr>
          </thead>
          <tbody>
            {moras.map((m) => {
              const dias = Math.floor(
                (Date.now() - new Date(m.reportado_at).getTime()) / 86_400_000,
              )
              // Nada en la tabla decía cuándo escalaría sola la mora, así que
              // el operador no sabía a cuál llegarle hoy. La Fase 3 espera el
              // reporte completo (Adenda 6.1 §4).
              const escalaEn = escalaEnMora(m, Date.now())
              const chip = chipReporte(m.reporte_estado)
              const cfg = FASE_CONFIG[m.estado]
              return (
                <tr
                  key={m.id}
                  onClick={() => setDetalleId(m.id)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">
                    {/* Con teclado la fila no recibe foco: el ticket abre el detalle. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetalleId(m.id)
                      }}
                      className="font-mono hover:underline focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                    >
                      {m.ticket_numero}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{m.inquilino_nombre}</td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                    {m.inmueble_codigo && (
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-1.5">
                        {m.inmueble_codigo}
                      </span>
                    )}
                    {m.inmueble_direccion ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatCurrency(m.monto_mora)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{dias}</td>
                  <td
                    className={`px-4 py-3 text-center ${
                      typeof escalaEn === 'number' && escalaEn <= 1
                        ? 'font-semibold text-amber-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {escalaEn === null
                      ? '—'
                      : escalaEn === 'espera_reporte'
                        ? 'Espera reporte completo'
                        : escalaEn === 0
                        ? 'Hoy'
                        : escalaEn < 0
                          ? `Vencida hace ${-escalaEn} d`
                          : `${escalaEn} d`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.coarrendatario_nombre ? (
                      <span className="inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                        Sí
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${cfg.chip} ${cfg.chipText}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.bdot}`} />
                      {cfg.label}
                    </span>
                    {chip && (
                      <span className={cn('mt-1 block w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold', TONO_CHIP[chip.tono])}>
                        {chip.texto}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/expedientes/${m.expediente_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900 whitespace-nowrap"
                    >
                      Ver estudio <IconChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={esInterno ? 'Gestión de mora' : 'Reportar mora'}
        subtitle={
          esInterno
            ? 'Cola de moras reportadas por propietarios e inmobiliarias. Cada caso pasa a Fase 2 a los 4 días del reporte y a Fase 3 a los 10, si el reporte está completo; la columna “Escala en” marca los que ya toca escalar.'
            : 'Avise a Cofianza cuando un inquilino se atrase. Cofianza gestiona el caso en 3 fases (Recordatorio → Urgencia → Legal).'
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sin datos, «—» y no 0: un 0 afirma que no hay moras. */}
        <KpiCard label="Moras reportadas" value={stats?.reportadas_mes ?? '—'} sub="Este mes" />
        <KpiCard label="Resueltas" value={stats?.resueltas ?? '—'} color="primary" sub="Pagadas" />
        <KpiCard label="En gestión" value={stats?.en_gestion ?? '—'} color="coral" sub="Activas" />
        <KpiCard
          label="Monto en mora"
          value={stats ? formatCompactCOP(stats.monto_total) : '—'}
          color="red"
          sub="Total adeudado"
        />
      </div>

      {esInterno ? (
        <>
          {tablaMoras}
          {puedeEditarPagina && formularioReporte}
        </>
      ) : (
        <>
          {puedeEditarPagina && formularioReporte}
          {tablaMoras}
        </>
      )}

      {/* Modal detalle */}
      {detalleId && (
        <MoraDetalleModal
          moraId={detalleId}
          onClose={() => setDetalleId(null)}
          onChange={cargarDatos}
        />
      )}
    </div>
  )
}

// ============================================================
// KPI card
// ============================================================

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: number | string
  sub?: string
  color?: 'primary' | 'coral' | 'red'
}) {
  const colorClass =
    color === 'primary'
      ? 'text-primary-600'
      : color === 'coral'
        ? 'text-coral-700'
        : color === 'red'
          ? 'text-red-500'
          : 'text-gray-900'
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-3xl font-black leading-none tracking-tight ${colorClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function formatCompactCOP(monto: number): string {
  if (monto >= 1_000_000) {
    const m = monto / 1_000_000
    return `$${m.toFixed(m >= 10 ? 0 : 1)}M`
  }
  if (monto >= 1_000) return `$${(monto / 1_000).toFixed(0)}K`
  return formatCurrency(monto)
}

// ============================================================
// Modal detalle + historial del caso
// ============================================================

function MoraDetalleModal({
  moraId,
  onClose,
  onChange,
}: {
  moraId: string
  onClose: () => void
  onChange: () => void
}) {
  const [mora, setMora] = useState<IMoraDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  // P27: en Fase 3 el dueño anota que el inquilino le pagó; Cofianza lo revisa.
  const [reportaPago, setReportaPago] = useState(false)
  const rol = useAuthStore((s) => s.user?.rol)
  const esInterno = rol === 'administrador' || rol === 'operador_analista'
  const [enviando, setEnviando] = useState(false)
  const [acting, setActing] = useState(false)

  const recargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await morasService.getById(moraId)
      setMora(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar el detalle')
    } finally {
      setLoading(false)
    }
  }, [moraId])

  useEffect(() => {
    recargar()
  }, [recargar])

  async function handleEnviarMensaje() {
    if (!mensaje.trim()) return
    setEnviando(true)
    try {
      const pago = reportaPago && mora?.estado === 'fase_3'
      await morasService.agregarMensaje(moraId, mensaje.trim(), pago)
      if (mora?.estado === 'fase_3' && !esInterno) {
        toast.success(pago ? 'Le avisamos a Cofianza del pago para que lo revise.' : 'Le avisamos a Cofianza de su nota.')
      }
      setMensaje('')
      setReportaPago(false)
      await recargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar mensaje')
    } finally {
      setEnviando(false)
    }
  }

  async function handleEscalar() {
    setActing(true)
    try {
      const escalada = await morasService.escalar(moraId, mora?.estado)
      avisarResultado('Mora escalada', escalada)
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al escalar')
      // 409: otra persona ya la movió de fase; se muestra la fase real.
      if (err instanceof ApiClientError && err.statusCode === 409) {
        await recargar()
        onChange()
      }
    } finally {
      setActing(false)
    }
  }

  async function handleReanudar() {
    setActing(true)
    try {
      await morasService.reanudarWhatsapp(moraId)
      toast.success('El WhatsApp de Fase 3 sigue: sale en el horario de cobranza.')
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reanudar el WhatsApp')
    } finally {
      setActing(false)
    }
  }

  async function handlePagar() {
    setActing(true)
    try {
      await morasService.marcarPagada(moraId)
      toast.success('Mora marcada como pagada')
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar pagada')
    } finally {
      setActing(false)
    }
  }

  const [cancelarAbierto, setCancelarAbierto] = useState(false)
  const [pagarAbierto, setPagarAbierto] = useState(false)
  const [escalarAbierto, setEscalarAbierto] = useState(false)
  async function handleCancelar(motivo: string) {
    setActing(true)
    try {
      await morasService.cancelar(moraId, motivo)
      toast.success('Mora cancelada')
      setCancelarAbierto(false)
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar')
    } finally {
      setActing(false)
    }
  }

  // ── Adenda 6.1 §4: contrato autenticado de un contrato en notaría ──
  const [archivoDetalle, setArchivoDetalle] = useState<File | null>(null)
  const [verificarAbierto, setVerificarAbierto] = useState(false)
  const [rechazo, setRechazo] = useState<Exclude<ResultadoVerificacion, 'verificado'> | null>(null)

  async function handleCargarDocumento() {
    if (!archivoDetalle) return
    setActing(true)
    try {
      const r = await morasService.cargarDocumentoNotaria(moraId, archivoDetalle)
      toast.success(
        r.documento_previo
          ? 'Este contrato ya tenía cargado el documento autenticado en notaría: Cofianza verifica ese.'
          : 'Contrato autenticado cargado: Cofianza lo verifica y, si lo confirma, el reporte queda completo desde hoy.',
      )
      setArchivoDetalle(null)
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el contrato autenticado')
    } finally {
      setActing(false)
    }
  }

  /** `false` si falló sin que otra persona lo resolviera: el diálogo conserva la nota para reintentar. */
  async function handleVerificar(resultado: ResultadoVerificacion, nota?: string): Promise<boolean> {
    setActing(true)
    try {
      const r = await morasService.verificarNotaria(moraId, resultado, nota)
      toast.success(
        resultado === 'verificado'
          ? `Reporte completo${r.plazo_pago_hasta ? `: plazo de pago de Cofianza hasta el ${fechaDia(r.plazo_pago_hasta)}` : ''}. Le dejamos el aviso a la inmobiliaria o al propietario.`
          : 'Quedó registrado que Cofianza no paga esta mora. Le dejamos el aviso a la inmobiliaria o al propietario.',
      )
      setVerificarAbierto(false)
      setRechazo(null)
      await recargar()
      onChange()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar la verificación')
      if (err instanceof ApiClientError && err.statusCode === 409) {
        setVerificarAbierto(false)
        setRechazo(null)
        await recargar()
        onChange()
        return true
      }
      return false
    } finally {
      setActing(false)
    }
  }

  const [abriendoDocumento, setAbriendoDocumento] = useState(false)
  async function handleVerDocumento() {
    if (!mora || abriendoDocumento) return
    setAbriendoDocumento(true)
    try {
      // Solo el documento cargado a mano (el autenticado): nunca el PDF original sin firmas en su lugar.
      const abierto = await abrirEnPestana(async () => {
        const d = await contratoService.descargarContratoFirmado(mora.contrato_id)
        return d.fuente === 'manual' ? d.url : null
      })
      if (!abierto) toast.error('El contrato no tiene el documento autenticado cargado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir el documento')
    } finally {
      setAbriendoDocumento(false)
    }
  }

  const [hoyColombia] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }))
  const cfg = mora ? FASE_CONFIG[mora.estado] : null
  const esTerminal = mora?.estado === 'pagada' || mora?.estado === 'cancelada'
  // Solo lectura: ve el caso y el historial, pero no escribe ni cambia la fase.
  const puedeEditar = usePuedeEditar()
  const sinAcciones = esTerminal || !puedeEditar
  // P27: la Fase 3 la decide Cofianza; el dueño escala a Fase 2 desde el día 4
  // del reporte y, en Fase 3, ya no cierra el caso (anota el pago en el historial).
  const fase2Desde = mora ? new Date(new Date(mora.reportado_at).getTime() + 4 * 86_400_000) : null
  // Adenda 6.1 §4: con «Cofianza no paga» no se escala; a Fase 3 solo con el reporte completo (la API también lo frena).
  const reporte = mora ? estadoReporte(mora) : 'completo'
  const escalaPorReporte = reporte !== 'no_paga' && (mora?.estado !== 'fase_2' || reporte === 'completo')
  const puedeEscalar = escalaPorReporte && (esInterno
    ? mora?.estado !== 'fase_3'
    : mora?.estado === 'fase_1' && !!fase2Desde && Date.now() >= fase2Desde.getTime())
  const puedeCerrar = esInterno || mora?.estado !== 'fase_3'
  const notaReporte =
    !mora || mora.estado === 'fase_3'
      ? null
      : reporte === 'no_paga'
        ? 'Cofianza no paga esta mora: el caso no se escala.'
        : mora.estado === 'fase_2' && reporte !== 'completo'
          ? 'El caso pasa a Fase 3 cuando el reporte esté completo.'
          : null
  const notaDueno =
    notaReporte ?? (esInterno || !mora
      ? null
      : mora.estado === 'fase_3'
        ? 'Cofianza gestiona el caso. Si el inquilino le pagó, anótelo en el historial del caso.'
        : mora.estado === 'fase_2'
          ? 'El paso a Fase 3 lo decide Cofianza.'
          : !puedeEscalar && fase2Desde
            ? `Podrá escalar a Fase 2 desde el ${fase2Desde.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}.`
            : null)

  return (
    <>
      <Modal isOpen onClose={onClose} bare ariaLabel="Detalle del caso de mora" closeOnBackdrop={false} className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900 flex flex-wrap items-center gap-2">
              {mora?.ticket_numero ?? <Skeleton className="h-6 w-32" />}
              {cfg && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.chip} ${cfg.chipText}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.bdot}`} />
                  {cfg.label}
                </span>
              )}
            </h2>
            {mora && (
              <p className="text-sm text-gray-500 mt-0.5 break-words">
                {mora.inquilino_nombre} · {mora.inmueble_direccion ?? '—'}
              </p>
            )}
          </div>
          <button data-modal-close aria-label="Cerrar"
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {loading || !mora ? (
            <div role="status" aria-live="polite" className="space-y-4 py-2">
              <span className="sr-only">Cargando el detalle de la mora…</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : (
            <>
              {/* Detalle resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Field label="Monto" value={formatCurrency(mora.monto_mora)} />
                <Field
                  label="Vencimiento canon"
                  // Fecha sin hora (medianoche UTC): sin timeZone, en Colombia
                  // se veía un día antes que en el WhatsApp.
                  value={new Date(mora.fecha_vencimiento_canon).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                />
                <Field
                  label="Reportada el"
                  value={new Date(mora.reportado_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                />
                <Field label="Teléfono inquilino" value={mora.inquilino_telefono ?? '—'} />
                {/* Reporte de la Oficina Virtual (punto 2) y Adenda 6.1 §4: estado del reporte y plazo de pago. */}
                <Field label="Estado del reporte" value={textoReporte(mora, { esInterno, hoy: hoyColombia })} />
                {/* Contrato migrado (§5.1.4): solo los REPORTABLE autorizan el reporte a centrales. */}
                {mora.reportable_centrales && (
                  <Field
                    label="Reporte a centrales"
                    value={
                      mora.reportable_centrales.reportable == null
                        ? 'Sin definir'
                        : mora.reportable_centrales.reportable
                          ? 'REPORTABLE'
                          : `NO REPORTABLE${
                              mora.reportable_centrales.motivo === 'formato_anterior'
                                ? ' (formato anterior)'
                                : mora.reportable_centrales.motivo === 'sin_autorizacion_reporte'
                                  ? ' (el contrato no lo autoriza)'
                                  : ''
                            }`
                    }
                  />
                )}
              </div>

              {/* Adenda 6.1 §4: contrato con firma en notaría. */}
              {mora.reporte_notaria && (
                <div
                  className={cn(
                    'rounded-lg border p-3 text-sm space-y-2',
                    reporte === 'no_paga'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : reporte === 'incompleto'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-gray-50 text-gray-800',
                  )}
                >
                  <p className="font-semibold">Contrato con firma en notaría</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <dt className="inline font-semibold">Fecha de autenticación registrada: </dt>
                      <dd className="inline">{mora.reporte_notaria.fecha_autenticacion ? fechaDia(mora.reporte_notaria.fecha_autenticacion) : '—'}</dd>
                    </div>
                    {mora.reporte_notaria.rango && (
                      <div>
                        <dt className="inline font-semibold">Rango permitido: </dt>
                        <dd className="inline">
                          del {fechaDia(mora.reporte_notaria.rango.desde)} al {fechaDia(mora.reporte_notaria.rango.hasta)}
                          {mora.reporte_notaria.fecha_en_rango === false ? ' (fuera de rango)' : ''}
                        </dd>
                      </div>
                    )}
                    <div className="sm:col-span-2 break-words">
                      <dt className="inline font-semibold">Contrato autenticado: </dt>
                      <dd className="inline">{mora.reporte_notaria.documento ? mora.reporte_notaria.documento.nombre_archivo : 'no está cargado'}</dd>
                    </div>
                  </dl>

                  {reporte === 'incompleto' && (
                    <p>Sin el contrato autenticado el reporte está incompleto: no corre el plazo de pago y el caso no pasa a Fase 3. Si no lo presenta, Cofianza no paga.</p>
                  )}
                  {reporte === 'por_verificar' && !esInterno && (
                    <p>Cofianza verifica que el documento corresponda al contrato y que la fecha de autenticación esté en el rango. Si lo confirma, el reporte queda completo desde que se cargó el documento.</p>
                  )}
                  {reporte === 'no_paga' && (
                    <p>
                      Cofianza no paga esta mora: {motivoNoPaga(mora.reporte_notaria.verificacion?.resultado, mora.reporte_notaria.rango?.dias, mora.reporte_notaria.verificacion?.automatica)}.
                      {mora.reporte_notaria.verificacion?.nota ? ` Nota de Cofianza: ${mora.reporte_notaria.verificacion.nota}` : ''}
                    </p>
                  )}
                  {reporte === 'completo' && mora.reporte_notaria.verificacion?.resultado === 'verificado' && (
                    <p>Cofianza verificó el contrato autenticado el {fechaDiaColombia(mora.reporte_notaria.verificacion.en)}.</p>
                  )}

                  {/* Contrato V3: el contrato autenticado lo carga la inmobiliaria; la API no se lo deja al propietario. */}
                  {reporte === 'incompleto' && !esTerminal && rol === 'propietario' && mora.notaria_carga_inmobiliaria === true && (
                    <p className="text-xs">El contrato autenticado de este contrato lo carga la inmobiliaria.</p>
                  )}

                  {/* Cargar el contrato autenticado (quien custodia: inmobiliaria o propietario; o el administrador). */}
                  {reporte === 'incompleto' && !esTerminal && puedeEditar && rol !== 'operador_analista' &&
                    !(rol === 'propietario' && mora.notaria_carga_inmobiliaria === true) && (
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <label htmlFor="mora-detalle-notaria" className="block text-xs font-medium mb-1">
                          Contrato autenticado en notaría (PDF, hasta 20 MB)
                        </label>
                        <input
                          id="mora-detalle-notaria"
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null
                            if (f && (f.type !== 'application/pdf' || f.size > 20 * 1024 * 1024)) {
                              toast.error('El contrato autenticado debe ser un PDF de hasta 20 MB.')
                              e.target.value = ''
                              setArchivoDetalle(null)
                              return
                            }
                            setArchivoDetalle(f)
                          }}
                          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCargarDocumento}
                        disabled={acting || !archivoDetalle}
                        className="inline-flex min-h-10 justify-center items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-50"
                      >
                        {acting ? <IconLoader size={14} className="animate-spin" /> : <IconUpload size={14} />}
                        Cargar el contrato autenticado
                      </button>
                    </div>
                  )}

                  {/* Operaciones: verifica documento y fecha. */}
                  {reporte === 'por_verificar' && esInterno && puedeEditar && !esTerminal && (
                    <div className="space-y-2">
                      <p className="text-xs">
                        Revise que el documento corresponda a este contrato y que la fecha del sello notarial esté en el rango.
                        Si lo da por verificado, el reporte queda completo desde que se cargó el documento
                        {mora.reporte_notaria.presentado_en ? ` (${fechaDiaColombia(mora.reporte_notaria.presentado_en)})` : ''} y desde ese día
                        corren los 20 días calendario del plazo de pago.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleVerDocumento}
                          disabled={abriendoDocumento}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                        >
                          <IconEye size={14} /> Ver documento
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerificarAbierto(true)}
                          disabled={acting || mora.reporte_notaria.fecha_en_rango === false}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                        >
                          <IconCheck size={14} /> Dar por verificado
                        </button>
                        <button
                          type="button"
                          onClick={() => setRechazo('no_corresponde')}
                          disabled={acting}
                          className="min-h-10 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          No corresponde
                        </button>
                        <button
                          type="button"
                          onClick={() => setRechazo('fecha_fuera_de_rango')}
                          disabled={acting}
                          className="min-h-10 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Fecha fuera de rango
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contrato migrado (Adenda 1 §3): lo que la inmobiliaria debe entregar por la mora. */}
              {mora.diferidos && (
                <div>
                  <ListaDiferidos d={mora.diferidos} intro="Contrato migrado. Falta entregar a Cofianza:" />
                  {esInterno && mora.diferidos.items.some((i) => i.pendiente) && (
                    <Link
                      href={`/admin/migracion/lotes/${mora.diferidos.lote_id}?fila=${mora.diferidos.fila_id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
                    >
                      Registrar entregas <IconChevronRight size={14} />
                    </Link>
                  )}
                </div>
              )}

              {mora.descripcion && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Nota inicial
                  </p>
                  {mora.descripcion}
                </div>
              )}

              {/* Chat */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Historial del caso
                </h3>
                <div className="bg-gray-100 rounded-lg p-3 max-h-72 overflow-y-auto space-y-2">
                  {mora.mensajes.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Sin mensajes todavía</p>
                  ) : (
                    mora.mensajes.map((msg) => {
                      const esSistema = msg.autor_tipo === 'sistema'
                      const esInquilino = msg.autor_tipo === 'inquilino'
                      // El nombre de quien escribió o hizo la acción: el tipo
                      // crudo decía «PROPIETARIO» también de la inmobiliaria.
                      const autor = msg.autor
                        ? `${msg.autor.nombre ?? ''} ${msg.autor.apellido ?? ''}`.trim()
                        : ''
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${esSistema ? 'justify-center' : esInquilino ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                              esSistema
                                ? 'bg-white/60 border border-gray-200 text-gray-500 italic text-xs text-center max-w-full'
                                : esInquilino
                                  ? 'bg-primary-100 border border-primary-200 text-primary-900'
                                  : 'bg-white border border-gray-200 text-gray-800'
                            }`}
                          >
                            {!esSistema && (
                              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60 mb-0.5">
                                {autor || msg.autor_tipo}
                              </p>
                            )}
                            <p>{msg.mensaje}</p>
                            <p className="text-[10px] opacity-60 mt-1">
                              {new Date(msg.created_at).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {esSistema && autor && ` · ${autor}`}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {mora.whatsapp_pausado_at && mora.estado === 'fase_3' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="mr-auto">
                      El WhatsApp de Fase 3 está en pausa: el dueño reportó un pago.
                      {esInterno && ' Si lo confirma, marque la mora pagada; si no, reanúdelo.'}
                    </p>
                    {esInterno && puedeEditar && (
                      <button
                        type="button"
                        onClick={handleReanudar}
                        disabled={acting}
                        className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Reanudar WhatsApp
                      </button>
                    )}
                  </div>
                )}

                {!sinAcciones && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && mensaje.trim()) {
                          e.preventDefault()
                          handleEnviarMensaje()
                        }
                      }}
                      placeholder="Escriba una nota interna…"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleEnviarMensaje}
                      disabled={enviando || !mensaje.trim()}
                      className="px-4 py-2 text-sm font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 rounded-lg"
                    >
                      {enviando ? <IconLoader size={14} className="animate-spin" /> : 'Enviar'}
                    </button>
                  </div>
                )}
                {!sinAcciones && !esInterno && mora.estado === 'fase_3' && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={reportaPago}
                      onChange={(e) => setReportaPago(e.target.checked)}
                      className="h-4 w-4 accent-primary-600"
                    />
                    Es un pago del inquilino (Cofianza lo revisa antes de seguir con el cobro)
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        {mora && !sinAcciones && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2 justify-end">
            {notaDueno && <p className="mr-auto text-xs text-gray-600">{notaDueno}</p>}
            {puedeCerrar && (
              <>
                <button
                  type="button"
                  onClick={() => setCancelarAbierto(true)}
                  disabled={acting}
                  className="px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancelar caso
                </button>
                <button
                  type="button"
                  onClick={() => setPagarAbierto(true)}
                  disabled={acting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-300 rounded-lg hover:bg-primary-100 disabled:opacity-50"
                >
                  <IconCheck size={14} /> Marcar pagada
                </button>
              </>
            )}
            {puedeEscalar && (
              <button
                type="button"
                onClick={() => setEscalarAbierto(true)}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-ink-900 bg-coral-500 hover:bg-coral-400 rounded-lg disabled:opacity-50"
              >
                {acting ? <IconLoader size={14} className="animate-spin" /> : <IconClock size={14} />}
                Escalar a {mora.estado === 'fase_1' ? 'Fase 2 (Urgencia)' : 'Fase 3 (Legal)'}
              </button>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        isOpen={pagarAbierto}
        onClose={() => setPagarAbierto(false)}
        onConfirm={async () => {
          setPagarAbierto(false)
          await handlePagar()
        }}
        isLoading={acting}
        title="Marcar la mora como pagada"
        message="El caso se cierra y se detienen las escalaciones al inquilino. Esta acción no se puede deshacer."
        confirmLabel="Marcar pagada"
      />
      <ConfirmDialog
        isOpen={escalarAbierto}
        onClose={() => setEscalarAbierto(false)}
        onConfirm={async () => {
          setEscalarAbierto(false)
          await handleEscalar()
        }}
        isLoading={acting}
        variant="danger"
        title={`Escalar a ${mora?.estado === 'fase_1' ? 'Fase 2 (Urgencia)' : 'Fase 3 (Legal)'}`}
        message="Al inquilino le llega el WhatsApp de escalación cuando la ley lo permite: en el horario de cobranza y a los 7 días del anterior. No se puede deshacer."
        confirmLabel="Escalar"
      />
      <ConfirmDialog
        isOpen={verificarAbierto}
        onClose={() => setVerificarAbierto(false)}
        onConfirm={() => handleVerificar('verificado')}
        isLoading={acting}
        title="Dar por verificado el contrato autenticado"
        message="Confirma que el documento corresponde a este contrato y que la fecha del sello notarial está en el rango. El reporte queda completo desde que se cargó el documento y desde ese día corren los 20 días calendario del plazo de pago de Cofianza."
        confirmLabel="Dar por verificado"
      />
      <MotivoDialog
        key={rechazo ?? 'sin-rechazo'}
        isOpen={rechazo !== null}
        onClose={() => setRechazo(null)}
        onConfirm={(nota) => handleVerificar(rechazo!, nota)}
        isLoading={acting}
        title={rechazo === 'fecha_fuera_de_rango' ? 'Fecha de autenticación fuera de rango' : 'El documento no corresponde al contrato'}
        descripcion="Cofianza no paga esta mora y el caso no se escala. Es definitivo: la inmobiliaria o el propietario reciben el aviso con su nota."
        label="Nota para la inmobiliaria o el propietario"
        placeholder="Ej.: el documento cargado es el contrato de otro inmueble"
        confirmLabel="Cofianza no paga"
        variant="danger"
      />
      <MotivoDialog
        isOpen={cancelarAbierto}
        onClose={() => setCancelarAbierto(false)}
        onConfirm={handleCancelar}
        isLoading={acting}
        title="Cancelar caso de mora"
        label="Motivo de la cancelación"
        placeholder="Ej.: el inquilino pagó por fuera de la plataforma, error de registro…"
        confirmLabel="Cancelar caso"
        variant="danger"
      />
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
