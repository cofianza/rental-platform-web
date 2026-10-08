/**
 * Panel de calibración del modelo — Adenda 1 a la Política V4.1, §11.
 *
 * "Todos estos valores deben poder modificarse desde el panel de calibración,
 * sin intervención de desarrollo, únicamente por la Gerencia General, y todo
 * cambio debe quedar registrado con fecha, valor anterior, valor nuevo y
 * usuario."
 *
 * Cada parámetro se edita en su fila; el backend valida rango/entero y
 * escribe el historial. La advertencia de la Adenda (p. ej. lo que el factor
 * de ingreso hace con las reglas duras) se muestra al lado del valor, no
 * escondida: es la parte del documento que Gerencia pidió "dejar registrada".
 *
 * Adenda 1 del módulo de contratos, respuesta 17: los parámetros de riesgo
 * solo los cambia la Gerencia General; a otro administrador le llegan con
 * `editable: false` y se ven de solo lectura (el API igual responde 403).
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  calibracionService,
  type IParametroCalibracion,
  type IHistorialCalibracion,
  type ICascadaCentrales,
  type IRevisionManual,
} from '@/services/calibracionService'
import { IconLoader, IconLock, IconAlertTriangle, IconCheck, IconSearch, IconChevronDown, IconArrowRight } from '@/components/icons'
import { formatDate } from '@/lib/constants'
import { sinReferenciasInternas } from '@/lib/utils'

// es-CO: coma decimal y punto de miles («1,15», «3.000.000»).
const fmt = (n: number, entero: boolean) => n.toLocaleString('es-CO', { maximumFractionDigits: entero ? 0 : 4 })

type Unidad = 'cop' | 'pct' | 'puntos' | 'dias' | 'dias_habiles' | 'meses' | 'mes' | 'onoff' | 'num'

/**
 * Nombre humano, grupo y unidad de cada parámetro. La pantalla los titulaba con
 * su clave de código y los mostraba en una sola lista larga sin unidades:
 * Gerencia tenía que adivinar si «15» eran días, meses o por ciento.
 */
const META: Record<string, { nombre: string; grupo: Grupo; unidad: Unidad }> = {
  // Evaluación del prospecto
  UMBRAL_APROBACION_AUTOMATICA: { nombre: 'Puntaje para aprobar automáticamente', grupo: 'evaluacion', unidad: 'puntos' },
  UMBRAL_ZONA_GRIS: { nombre: 'Puntaje mínimo para no rechazar (inicio de la zona gris)', grupo: 'evaluacion', unidad: 'puntos' },
  UMBRAL_COARRENDATARIO: { nombre: 'Puntaje mínimo del coarrendatario', grupo: 'evaluacion', unidad: 'puntos' },
  UMBRAL_SCORE_RECHAZO: { nombre: 'Score de la central por debajo del cual se rechaza', grupo: 'evaluacion', unidad: 'num' },
  UMBRAL_SCORE_REVISION: { nombre: 'Score de la central hasta el que va a revisión manual', grupo: 'evaluacion', unidad: 'num' },
  UMBRAL_CASCADA_RECHAZO: { nombre: 'Rechazo sin consultar la segunda central (por debajo de)', grupo: 'evaluacion', unidad: 'puntos' },
  UMBRAL_CASCADA_APROBACION: { nombre: 'Aprobación sin consultar la segunda central (desde)', grupo: 'evaluacion', unidad: 'puntos' },
  FACTOR_AJUSTE_INGRESO: { nombre: 'Factor de ajuste del ingreso', grupo: 'evaluacion', unidad: 'num' },
  UMBRAL_DIFERENCIA_INGRESO: { nombre: 'Diferencia entre ingreso declarado y estimado que manda a revisión', grupo: 'evaluacion', unidad: 'pct' },
  UMBRAL_SIMILITUD_BIOMETRICA: { nombre: 'Similitud mínima del reconocimiento facial', grupo: 'evaluacion', unidad: 'pct' },
  // Topes de canon
  CANON_MAX_TRANSITORIO: { nombre: 'Canon máximo de vivienda sin coafianzamiento', grupo: 'canon', unidad: 'cop' },
  TOPE_CANON_COMERCIAL: { nombre: 'Canon máximo comercial sin coafianzamiento (sin IVA)', grupo: 'canon', unidad: 'cop' },
  TOLERANCIA_CANON: { nombre: 'Cuánto puede subir el canon del contrato sobre el evaluado', grupo: 'canon', unidad: 'pct' },
  TOPE_CANON_INGRESO_RECALCULO: { nombre: 'Relación canon/ingreso máxima al pactar un canon mayor', grupo: 'canon', unidad: 'pct' },
  // Precios y paquetes
  PRECIO_ESTUDIO_INDIVIDUAL: { nombre: 'Precio del estudio (sin IVA)', grupo: 'precios', unidad: 'cop' },
  TARIFA_IVA: { nombre: 'Tarifa de IVA', grupo: 'precios', unidad: 'pct' },
  VIGENCIA_PAQUETE_MESES: { nombre: 'Vigencia de un paquete de estudios', grupo: 'precios', unidad: 'meses' },
  ALERTA_SALDO_MINIMO_CUPOS: { nombre: 'Avisar a la inmobiliaria cuando le queden menos de', grupo: 'precios', unidad: 'num' },
  PORCENTAJE_BENEFICIO_TRADICIONAL: { nombre: 'Beneficio de la inmobiliaria en modalidad Tradicional', grupo: 'precios', unidad: 'pct' },
  ALERTA_MEZCLA_TRADICIONAL_PAQUETE_25: { nombre: 'Alerta: % de contratos Tradicional con paquete de 25', grupo: 'precios', unidad: 'pct' },
  // Autorización del prospecto
  DIAS_EXPIRACION_ESTUDIO: { nombre: 'Plazo del prospecto para autorizar', grupo: 'autorizacion', unidad: 'dias' },
  VIGENCIA_CRC_DIAS: { nombre: 'Vigencia del certificado de riesgo', grupo: 'autorizacion', unidad: 'dias' },
  MAX_INTENTOS_DOCUMENTO: { nombre: 'Intentos para digitar el documento', grupo: 'autorizacion', unidad: 'num' },
  MAX_CORRECCIONES_DOCUMENTO: { nombre: 'Correcciones de documento por estudio', grupo: 'autorizacion', unidad: 'num' },
  MAX_REENVIOS_ENLACE: { nombre: 'Reenvíos del enlace de autorización por estudio', grupo: 'autorizacion', unidad: 'num' },
  ALERTA_BLOQUEO_WHATSAPP: { nombre: 'WhatsApp al asesor cuando un estudio se bloquea por documento', grupo: 'autorizacion', unidad: 'onoff' },
  // Contratos
  VIGENCIA_MESES_DEFECTO: { nombre: 'Vigencia sugerida del contrato', grupo: 'contratos', unidad: 'meses' },
  MAX_CLAUSULAS_ADICIONALES: { nombre: 'Máximo de cláusulas adicionales por contrato', grupo: 'contratos', unidad: 'num' },
  DIAS_EXPIRACION_FIRMA: { nombre: 'Plazo para firmar en Auco', grupo: 'contratos', unidad: 'dias' },
  DIAS_RESERVA_INMUEBLE: { nombre: 'Reserva del inmueble mientras se elabora el contrato', grupo: 'contratos', unidad: 'dias_habiles' },
  IPC_ANUAL: { nombre: 'IPC anual para el reajuste del canon', grupo: 'contratos', unidad: 'pct' },
  // Cobro mensual
  TARIFA_COBRO_DESDE: { nombre: 'Mes desde el que la plataforma cobra la tarifa mensual', grupo: 'cobro', unidad: 'mes' },
  // Migración de cartera
  MESES_SIN_MORA_REQUERIDOS: { nombre: 'Meses sin mora que se declaran por contrato migrado', grupo: 'migracion', unidad: 'meses' },
  TARIFA_MIGRACION_REPORTABLE: { nombre: 'Tarifa mensual de un contrato migrado reportable', grupo: 'migracion', unidad: 'pct' },
  RECARGO_NO_REPORTABLE: { nombre: 'Recargo a un contrato migrado no reportable (puntos %)', grupo: 'migracion', unidad: 'num' },
  MAX_FILAS_POR_CARGA: { nombre: 'Máximo de contratos por archivo', grupo: 'migracion', unidad: 'num' },
  UMBRAL_ALERTA_EXPOSICION_LOTE: { nombre: 'Exposición de un lote que avisa a Gerencia', grupo: 'migracion', unidad: 'cop' },
  DIAS_RESPUESTA_AUDITORIA: { nombre: 'Plazo para entregar soportes de una auditoría', grupo: 'migracion', unidad: 'dias_habiles' },
  DIAS_VIGENCIA_LOTE_SIN_FIRMA: { nombre: 'Plazo para firmar el Acta de Migración', grupo: 'migracion', unidad: 'dias' },
}

type Grupo = 'evaluacion' | 'canon' | 'precios' | 'autorizacion' | 'contratos' | 'cobro' | 'migracion' | 'otros'

const GRUPOS: { id: Grupo; titulo: string; ayuda: string }[] = [
  { id: 'evaluacion', titulo: 'Evaluación del prospecto', ayuda: 'Puntajes con los que el motor aprueba, rechaza o manda a revisión manual.' },
  { id: 'canon', titulo: 'Topes de canon', ayuda: 'Hasta qué canon se afianza y cuánto puede cambiar al hacer el contrato.' },
  { id: 'precios', titulo: 'Precios y paquetes', ayuda: 'Lo que se cobra por el estudio y las reglas de los paquetes de cupos.' },
  { id: 'autorizacion', titulo: 'Autorización del prospecto', ayuda: 'Plazos, intentos y reenvíos del enlace que firma el prospecto.' },
  { id: 'contratos', titulo: 'Contratos', ayuda: 'Plazos de firma, reserva del inmueble y reajuste del canon.' },
  { id: 'cobro', titulo: 'Cobro mensual de la fianza', ayuda: 'Desde cuándo la plataforma liquida y cobra la tarifa mensual.' },
  { id: 'migracion', titulo: 'Migración de cartera', ayuda: 'Reglas para traer contratos que ya estaban afianzados por fuera.' },
  { id: 'otros', titulo: 'Otros', ayuda: '' },
]

const metaDe = (clave: string) => META[clave] ?? { nombre: clave, grupo: 'otros' as Grupo, unidad: 'num' as Unidad }
const nombreDe = (clave: string) => metaDe(clave).nombre

/** 209912 = «nunca»: es el valor con el que el cobro queda apagado. */
const MES_APAGADO = 209912
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** El valor con su unidad, como lo diría una persona: «$80.000», «19 %», «15 días». */
function conUnidad(n: number, p: Pick<IParametroCalibracion, 'clave' | 'entero'>): string {
  const u = metaDe(p.clave).unidad
  const v = fmt(n, p.entero)
  switch (u) {
    case 'cop': return `$${v}`
    case 'pct': return `${v} %`
    case 'puntos': return `${v} pts`
    case 'dias': return `${v} ${n === 1 ? 'día' : 'días'}`
    case 'dias_habiles': return `${v} ${n === 1 ? 'día hábil' : 'días hábiles'}`
    case 'meses': return `${v} ${n === 1 ? 'mes' : 'meses'}`
    case 'onoff': return n === 1 ? 'Encendido' : 'Apagado'
    case 'mes': {
      if (n >= MES_APAGADO) return 'Sin activar'
      const anio = Math.floor(n / 100)
      const mes = n % 100
      return mes >= 1 && mes <= 12 ? `${MESES[mes - 1]} ${anio}` : String(n)
    }
    default: return v
  }
}

/** Las descripciones citan otros parámetros por su clave («más TARIFA_IVA»): se dicen por su nombre. */
const humanizar = (texto: string) =>
  sinReferenciasInternas(texto).replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (c) => (META[c] ? `«${META[c].nombre.toLowerCase()}»` : c))

const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '—')

function DatoCascada({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <dt className="text-xs font-semibold text-gray-600">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-gray-900">{valor}</dd>
      {sub && <dd className="text-xs text-gray-500">{sub}</dd>}
    </div>
  )
}

function FilaParametro({ p, onGuardado }: { p: IParametroCalibracion; onGuardado: () => void }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(String(p.valor))
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  // El error queda junto al campo y el cambio se confirma: un parámetro del
  // modelo afecta desde ya a todos los estudios.
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  const unidad = metaDe(p.clave).unidad
  const cambiado = Number(valor) !== p.valor
  const modificado = p.valor !== p.valorDefault
  const descripcion = humanizar(p.descripcion)

  function pedirConfirmacion() {
    const n = Number(valor)
    if (valor.trim() === '' || !Number.isFinite(n)) {
      setError('Escriba un número.')
      return
    }
    if (n < p.min || n > p.max) {
      setError(`Debe estar entre ${fmt(p.min, p.entero)} y ${fmt(p.max, p.entero)}.`)
      return
    }
    if (p.entero && !Number.isInteger(n)) {
      setError('Debe ser un número entero.')
      return
    }
    if (unidad === 'mes' && n < MES_APAGADO && (n % 100 < 1 || n % 100 > 12)) {
      setError('Escriba año y mes juntos, por ejemplo 202611 para noviembre de 2026.')
      return
    }
    setError(null)
    setConfirmar(true)
  }

  async function guardar() {
    setGuardando(true)
    try {
      await calibracionService.actualizar(p.clave, Number(valor), motivo.trim() || undefined)
      toast.success(`${nombreDe(p.clave)}: ${conUnidad(Number(valor), p)}`)
      setEditando(false)
      setConfirmar(false)
      setMotivo('')
      onGuardado()
    } catch (err) {
      setConfirmar(false)
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  function abrirEdicion() {
    // Un interruptor no se «edita»: se cambia al valor contrario y se confirma.
    if (unidad === 'onoff') {
      setValor(p.valor === 1 ? '0' : '1')
      setConfirmar(true)
      return
    }
    setEditando(true)
  }

  const valorNuevo = Number(valor)

  return (
    <div className="border-t border-gray-100 px-4 py-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-gray-900">{nombreDe(p.clave)}</p>
            {p.nivel === 'riesgo' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                <IconLock size={11} />
                Gerencia General
              </span>
            )}
            {modificado && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-800">
                Modificado · predeterminado {conUnidad(p.valorDefault, p)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-600">{descripcion}</p>
          {p.advertencia && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{humanizar(p.advertencia)}</span>
            </p>
          )}
          {p.actualizado_en && <p className="mt-1 text-xs text-gray-500">Último cambio: {formatDate(p.actualizado_en)}</p>}
        </div>

        {editando ? (
          <div className="flex w-full flex-col gap-2 sm:w-72">
            <label className="text-xs font-medium text-gray-700">
              Nuevo valor
              <input
                type="number"
                step={p.entero ? 1 : 0.01}
                min={p.min}
                max={p.max}
                value={valor}
                autoFocus
                onChange={(e) => {
                  setValor(e.target.value)
                  setError(null)
                }}
                aria-invalid={!!error}
                aria-describedby={`ayuda-${p.clave}`}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-right font-mono text-sm ${error ? 'border-red-400' : 'border-gray-300'}`}
              />
            </label>
            <p id={`ayuda-${p.clave}`} className="-mt-1 text-xs text-gray-500">
              {unidad === 'mes'
                ? `Año y mes juntos (202611 = noviembre 2026). ${fmt(MES_APAGADO, true)} = sin activar.`
                : `Entre ${conUnidad(p.min, p)} y ${conUnidad(p.max, p)}.`}
              {valor.trim() !== '' && Number.isFinite(valorNuevo) && cambiado && (
                <span className="font-semibold text-gray-700"> Quedaría en {conUnidad(valorNuevo, p)}.</span>
              )}
            </p>
            <label className="text-xs font-medium text-gray-700">
              Motivo (opcional, queda en el historial)
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={pedirConfirmacion}
                disabled={guardando || !cambiado}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-700 px-3 py-2 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-50"
              >
                {guardando ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false)
                  setValor(String(p.valor))
                  setError(null)
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {unidad === 'onoff' ? (
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${p.valor === 1 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'}`}
              >
                {conUnidad(p.valor, p)}
              </span>
            ) : (
              <span className="text-right text-xl font-bold text-gray-900">{conUnidad(p.valor, p)}</span>
            )}
            {p.editable === false ? (
              <span className="flex items-center gap-1 text-xs text-gray-500" title="Solo la Gerencia General puede cambiarlo">
                <IconLock size={14} />
                Solo lectura
              </span>
            ) : (
              <button
                type="button"
                onClick={abrirEdicion}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {unidad === 'onoff' ? (p.valor === 1 ? 'Apagar' : 'Encender') : 'Cambiar'}
              </button>
            )}
          </div>
        )}
      </div>
      {error && !editando && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      <ConfirmDialog
        isOpen={confirmar}
        onClose={() => {
          setConfirmar(false)
          if (!editando) setValor(String(p.valor))
        }}
        onConfirm={guardar}
        title={nombreDe(p.clave)}
        message={`Pasa de ${conUnidad(p.valor, p)} a ${conUnidad(valorNuevo, p)}. Aplica desde ya a los estudios y contratos que se procesen de aquí en adelante.`}
        confirmLabel="Guardar cambio"
        isLoading={guardando}
      />
    </div>
  )
}

export default function AdminCalibracionPage() {
  const { user } = useAuth()
  const [params, setParams] = useState<IParametroCalibracion[]>([])
  const [historial, setHistorial] = useState<IHistorialCalibracion[]>([])
  // null = no se pudo cargar (los indicadores son informativos: no tumban el panel).
  const [cascada, setCascada] = useState<ICascadaCentrales | null>(null)
  const [revision, setRevision] = useState<IRevisionManual | null>(null)
  const [loading, setLoading] = useState(true)
  // Un fallo de carga no es «sin cambios registrados»: se dice y se reintenta.
  const [errorCarga, setErrorCarga] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [historialCompleto, setHistorialCompleto] = useState(false)

  const cargar = async () => {
    try {
      const [p, h, c, r] = await Promise.all([
        calibracionService.listar(),
        calibracionService.historial(),
        calibracionService.getCascada(30).catch(() => null),
        calibracionService.getRevisionManual(30).catch(() => null),
      ])
      setParams(p)
      setHistorial(h)
      setCascada(c)
      setRevision(r)
      setErrorCarga(false)
    } catch {
      setErrorCarga(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.rol === 'administrador') void cargar()
    else setLoading(false)
  }, [user])

  const q = busqueda.trim().toLowerCase()
  const visibles = q
    ? params.filter((p) => `${nombreDe(p.clave)} ${p.descripcion} ${p.clave}`.toLowerCase().includes(q))
    : params
  const grupos = GRUPOS.map((g) => ({ ...g, items: visibles.filter((p) => metaDe(p.clave).grupo === g.id) })).filter(
    (g) => g.items.length > 0,
  )

  if (user?.rol !== 'administrador') {
    return (
      <div className="space-y-6">
        <PageHeader title="Calibración del modelo" />
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
          <IconLock className="text-red-600" size={20} />
          <p className="text-sm text-red-800">Solo la Gerencia (administrador) puede acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calibración del modelo"
        subtitle="Los valores con los que la plataforma evalúa, cobra y fija plazos. Cada cambio aplica de inmediato y queda en el historial."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <IconLoader size={28} className="animate-spin text-primary-600" />
        </div>
      ) : errorCarga ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">No se pudo cargar la calibración.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              void cargar()
            }}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
              <IconLock size={14} className="mt-0.5 shrink-0 text-gray-500" />
              <span>
                Los marcados <strong>Gerencia General</strong> afectan el riesgo y solo los cambia la Gerencia General. Los demás
                son operativos y los puede cambiar cualquier administrador.
              </span>
            </p>
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Antes de cambiar un puntaje o un tope, pida a Tecnología que valide la matriz de casos de prueba y confirme que
                ningún caso crítico cambia de resultado.
              </span>
            </p>
          </div>

          {/* Buscador + atajos a cada grupo: son ~40 parámetros en una sola página. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block sm:w-72">
              <span className="sr-only">Buscar parámetro</span>
              <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar: precio, IVA, días, puntaje…"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm"
              />
            </label>
            <nav aria-label="Grupos de parámetros" className="flex gap-1.5 overflow-x-auto">
              {grupos.map((g) => (
                <a
                  key={g.id}
                  href={`#grupo-${g.id}`}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-primary-300 hover:text-primary-800"
                >
                  {g.titulo}
                </a>
              ))}
              <a
                href="#indicadores"
                className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-primary-300 hover:text-primary-800"
              >
                Indicadores
              </a>
              <a
                href="#historial"
                className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-primary-300 hover:text-primary-800"
              >
                Historial
              </a>
            </nav>
          </div>

          {grupos.length === 0 && (
            <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Ningún parámetro coincide con «{busqueda}».
            </p>
          )}

          {grupos.map((g) => (
            <section key={g.id} id={`grupo-${g.id}`} className="scroll-mt-20">
              <h2 className="text-base font-bold text-gray-900">{g.titulo}</h2>
              {g.ayuda && <p className="mb-2 text-sm text-gray-500">{g.ayuda}</p>}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {g.items.map((p) => (
                  <FilaParametro key={p.clave} p={p} onGuardado={cargar} />
                ))}
              </div>
            </section>
          ))}

          {/* Indicadores (Política V4.1 §8, Adenda 2 §5.1 y §8): sirven para decidir
              si mover un umbral, por eso van después de los parámetros y plegados. */}
          <details id="indicadores" className="group scroll-mt-20 rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4">
              <span>
                <span className="block text-base font-bold text-gray-900">Indicadores de los últimos 30 días</span>
                <span className="block text-sm text-gray-500">Cómo se están comportando las centrales y la revisión manual.</span>
              </span>
              <IconChevronDown size={18} className="text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-gray-100 p-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Consultas a centrales de riesgo</h3>
                {cascada === null ? (
                  <p className="mt-1 text-sm text-gray-500">No se pudo cargar este resumen.</p>
                ) : cascada.total === 0 ? (
                  <p className="mt-1 text-sm text-gray-500">Sin estudios ejecutados desde {formatDate(cascada.desde)}.</p>
                ) : (
                  <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DatoCascada label="Estudios consultados" valor={cascada.total.toLocaleString('es-CO')} sub={`desde ${formatDate(cascada.desde)}`} />
                    <DatoCascada
                      label="Resueltos con una sola central"
                      valor={pct(cascada.una_central, cascada.total)}
                      sub={`${cascada.una_central.toLocaleString('es-CO')} estudios`}
                    />
                    <DatoCascada
                      label="Necesitaron las dos centrales"
                      valor={pct(cascada.dos_centrales, cascada.total)}
                      sub={`${cascada.dos_centrales.toLocaleString('es-CO')} estudios`}
                    />
                    <DatoCascada
                      label="Sin información de la cascada"
                      valor={cascada.sin_dato.toLocaleString('es-CO')}
                      sub={cascada.sin_dato > 0 ? 'no cuentan en los porcentajes' : 'todos quedaron registrados'}
                    />
                  </dl>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Revisión manual</h3>
                {revision === null ? (
                  <p className="mt-1 text-sm text-gray-500">No se pudo cargar este resumen.</p>
                ) : (
                  <>
                    <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <DatoCascada label="Esperando revisión ahora" valor={revision.en_revision_ahora.toLocaleString('es-CO')} />
                      <DatoCascada
                        label="Revisadas"
                        valor={revision.resueltas.toLocaleString('es-CO')}
                        sub={revision.resueltas > 0 ? `${pct(revision.dentro_del_sla, revision.resueltas)} dentro del plazo` : undefined}
                      />
                      <DatoCascada
                        label="Tiempo promedio de revisión"
                        valor={revision.promedio_horas_habiles === null ? '—' : `${revision.promedio_horas_habiles} h`}
                        sub={`horas hábiles · el plazo es ${revision.sla_horas_habiles} h`}
                      />
                      <DatoCascada
                        label="Enviadas a revisión por falta de ingreso"
                        valor={revision.escaladas_sin_ingreso.toLocaleString('es-CO')}
                        sub="las centrales no estimaron ingreso"
                      />
                    </dl>
                    <h3 className="mt-4 text-sm font-bold text-gray-900">DataCrédito</h3>
                    <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <DatoCascada label="Consultas" valor={revision.datacredito.consultas.toLocaleString('es-CO')} />
                      <DatoCascada label="Veces que no respondió" valor={revision.datacredito.caidas.toLocaleString('es-CO')} />
                      <DatoCascada
                        label="Tasa de caída"
                        valor={revision.datacredito.tasa_caida_pct === null ? '—' : `${revision.datacredito.tasa_caida_pct}%`}
                        sub="se revisa a los 3 meses"
                      />
                      <DatoCascada
                        label="Errores en los datos enviados"
                        valor={revision.datacredito.errores_de_dato.toLocaleString('es-CO')}
                        sub="documento o apellido; no es falla de la central"
                      />
                    </dl>
                    <p className="mt-2 text-xs text-gray-500">
                      Horas hábiles: lunes a viernes de 8:00 a 18:00 (sin descontar festivos). Las caídas se distinguen desde el 11
                      de septiembre de 2026.
                    </p>
                  </>
                )}
              </div>
            </div>
          </details>

          <section id="historial" className="scroll-mt-20">
            <h2 className="mb-2 text-base font-bold text-gray-900">Historial de cambios</h2>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-500">Sin cambios registrados.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Parámetro</th>
                      <th className="px-3 py-2">Cambio</th>
                      <th className="px-3 py-2">Quién</th>
                      <th className="px-3 py-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historialCompleto ? historial : historial.slice(0, 10)).map((h) => {
                      const def = params.find((p) => p.clave === h.clave) ?? { clave: h.clave, entero: false }
                      return (
                        <tr key={h.id} className="border-t border-gray-100">
                          <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatDate(h.created_at)}</td>
                          <td className="px-3 py-2">{nombreDe(h.clave)}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span className="text-gray-500">{h.valor_anterior === null ? '—' : conUnidad(h.valor_anterior, def)}</span>
                            <IconArrowRight size={12} className="mx-1.5 inline text-gray-400" />
                            <span className="font-semibold text-gray-900">{conUnidad(h.valor_nuevo, def)}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{h.usuario_nombre ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{h.motivo ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {historial.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setHistorialCompleto((v) => !v)}
                    className="w-full border-t border-gray-100 py-2 text-sm font-medium text-primary-700 hover:bg-gray-50"
                  >
                    {historialCompleto ? 'Ver solo los últimos 10' : `Ver los ${historial.length} cambios`}
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
