/**
 * DataCreditoReportDetail
 * Detalle colapsable del reporte DataCredito Experian HDC Plus
 * Secciones: Titular | Resumen Crediticio | Obligaciones | Endeudamiento Global | Huella de Consulta
 */

'use client'

import { useState } from 'react'
import { IconChevronDown, IconChevronUp, IconInfo } from '@/components/icons'
import type {
  DataCreditoResponse,
  DcAccount,
  DcAccountValues,
  DcGlobalIndebtedness,
  DcInquiryFootprint,
  DcNumeroLaxo,
  DcProductValue,
  DcReport,
} from '@/types/datacredito'

interface DataCreditoReportDetailProps {
  data: DataCreditoResponse
}

// ── Constantes del proveedor ────────────────────────────────

/** Los consolidados de `agregatedInfo` vienen en miles de pesos. */
const MILES = 1000

/** Maximo de filas antes de truncar con "y N mas...". */
const MAX_FILAS = 12
const MAX_CONSULTAS = 10

/** Tabla 41 — estados que implican deterioro del credito. */
const ESTADOS_NEGATIVOS = new Set(['02', '04', '05', '06', '09', '10', '14', '16'])
/** Tabla 41 — estados de una cuenta todavia abierta. */
const ESTADOS_ABIERTOS = new Set(['01', '02'])
/**
 * Tabla 4 (pags. 22-25) — eventos de pago cuya columna "Estado" dice CERRADA.
 * Son exactamente 02-12 y 49; a partir de 13 la tabla vuelve a marcar VIGENTE
 * (13-16 al dia con mora historica, 17-41 mora activa, 45 castigada,
 * 47 dudoso recaudo, 60 en reclamacion).
 *
 * Algunas entidades dejan `businessAccountStatus` en '01' (al dia) sobre
 * cuentas canceladas hace anos, asi que el evento de pago es el desempate.
 * Con la lista completa el conteo de vigentes sigue reproduciendo
 * `principals.currentCredits` sobre la evidencia del 2026-08-21 (6).
 */
const EVENTOS_CIERRE = new Set([
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '49',
])

/**
 * Anexo Advance Income DW, "Exclusiones del Producto Advance Income".
 * La razon 99 es el caso normal (hay estimacion); 50-54 la excluyen, y no
 * significan lo mismo entre si: la 53 dice que el buro reporta al titular
 * como fallecido, que no es "dato faltante" sino una alerta.
 */
const RAZONES_EXCLUSION_INGRESO: Record<number, string> = {
  50: 'Persona jurídica',
  51: 'Sin información en el buró',
  52: 'Sin desempeño crediticio',
  53: 'Titular reportado como fallecido',
  54: 'Solo figura como codeudor',
}
/** Exclusion que además es una alerta de identidad, no un dato ausente. */
const RAZON_INGRESO_FALLECIDO = 53

/** Tabla 18 — modelos de score. El servicio devuelve `modelCodeDesc` en null. */
const MODELOS_SCORE: Record<string, string> = {
  DF: 'Advance 1.1',
}

/**
 * Tabla 1 (seccion 8.1, pag. 18) — tipo de documento del titular.
 * El reporte devuelve el mismo `personIdType` que se envio en la peticion, asi
 * que este mapa debe ir siempre en linea con `TIPO_DOCUMENTO_MAP` del provider
 * (rental-platform-api/src/modules/estudios/providers/datacredito.provider.ts).
 * Las claves van a dos digitos porque PATH.xlsx declara el campo como
 * string(2) mientras el servicio lo emite como entero (1 y '01' conviven).
 */
const TIPOS_DOCUMENTO: Record<string, string> = {
  '01': 'Cédula de ciudadanía',
  '02': 'NIT',
  '03': 'Persona jurídica del extranjero',
  '04': 'Cédula de extranjería',
  '05': 'Pasaporte',
  '06': 'Permiso por protección temporal / carné diplomático',
  '07': 'Tarjeta de identidad',
  '08': 'Documento nacional de identidad',
  '09': 'Permiso especial de permanencia',
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Normaliza un numerico laxo descartando los centinelas del proveedor:
 * -1 ("la fuente no reporto"), '-' ("no existe informacion"), null y vacio.
 * Devuelve null para que la UI muestre '—' en vez de un valor inventado.
 */
function num(value: DcNumeroLaxo | boolean | null | undefined): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(parsed) || parsed === -1) return null
  return parsed
}

/**
 * Importe en pesos. `factor` = MILES para las secciones consolidadas
 * (`agregatedInfo`), 1 para el detalle, que ya viene en pesos.
 */
function formatCOP(value: DcNumeroLaxo | null | undefined, factor = 1): string {
  const parsed = num(value)
  if (parsed === null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parsed * factor)
}

function formatEntero(value: DcNumeroLaxo | null | undefined): string {
  const parsed = num(value)
  if (parsed === null) return '—'
  return new Intl.NumberFormat('es-CO').format(parsed)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    // El proveedor envia fechas 'AAAA-MM-DD' sin zona horaria. `new Date` las
    // interpreta como UTC y en Colombia (UTC-5) se mostrarian un dia antes, lo
    // que rompe el cruce de la fecha de expedicion contra la cedula escaneada.
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
    const fecha = soloFecha
      ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
      : new Date(dateStr)
    if (Number.isNaN(fecha.getTime())) return dateStr
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Concordancia de numero en el copy ("1 registrada" / "3 registradas"). */
function plural(cantidad: number, singular: string, pluralForma: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : pluralForma}`
}

/**
 * Limpia texto del proveedor: padding a 100 caracteres, columnas separadas
 * por multiples espacios y rellenos de guiones ('------------').
 */
function limpiar(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const texto = value.trim().replace(/\s{2,}/g, ' ')
  if (!texto || /^-+$/.test(texto)) return null
  return texto
}

/** Codigo comparable: el servicio emite '05' y 5 para el mismo concepto. */
function codigo(value: DcNumeroLaxo | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Codigo de respuesta a dos digitos: llega como entero 13 / 14. */
function codigoRespuesta(value: DcNumeroLaxo | null | undefined): string {
  const texto = codigo(value)
  return texto ? texto.padStart(2, '0') : ''
}

/**
 * Codigo de catalogo a dos digitos (Tablas 1, 2, 4 y 41). El servicio emite
 * indistintamente el entero 1 y la cadena '01' para el mismo concepto.
 */
function codigoCatalogo(value: DcNumeroLaxo | null | undefined): string {
  const texto = codigo(value)
  return texto ? texto.padStart(2, '0') : ''
}

/**
 * Tabla 2 (seccion 8.2, pag. 18) — estado del documento de identificacion.
 * `statusDesc` solo viaja en `location.nationalNatural`; cuando esa seccion
 * falta hay que traducir el codigo, porque un estado distinto de '00' es la
 * senal antifraude mas importante del bloque de identidad.
 */
function estadoDocumentoTabla2(codigoEstadoDoc: string): string | null {
  if (!codigoEstadoDoc) return null
  if (codigoEstadoDoc === '00') return 'VIGENTE'
  if (codigoEstadoDoc === '21') return 'CANCELADA POR MUERTE'
  if (codigoEstadoDoc === '88' || codigoEstadoDoc === '99') return 'EN TRÁMITE'
  const valor = Number(codigoEstadoDoc)
  if (!Number.isFinite(valor)) return null
  if (valor < 30) return 'CANCELADA'
  if (valor < 60) return 'NO EXPEDIDA'
  // La tabla no documenta 60-87 ni 89-98: se muestra el codigo crudo en vez de
  // inventarle una etiqueta, pero nunca en verde.
  return `CÓDIGO ${codigoEstadoDoc}`
}

function aniosDesde(fecha: string | null | undefined): number | null {
  if (!fecha) return null
  const inicio = new Date(fecha).getTime()
  if (Number.isNaN(inicio)) return null
  const anios = Math.floor((Date.now() - inicio) / (365.25 * 24 * 60 * 60 * 1000))
  return anios >= 0 ? anios : null
}

/** Nombre de la entidad. En tarjetas el nombre viaja en `businessLineCode`. */
function nombreEntidad(account: DcAccount | undefined): string {
  return limpiar(account?.businessLineName) ?? limpiar(account?.businessLineCode) ?? '—'
}

/** Etiqueta del producto. `accountTypeDesc` contradice la Tabla 3 en algunos registros. */
function tipoObligacion(account: DcAccount | undefined): string {
  return (
    limpiar(account?.subAccountTypeName) ??
    limpiar(account?.subAccountTypeDesc) ??
    limpiar(account?.accountTypeDesc) ??
    '—'
  )
}

/**
 * Estimacion de ingreso mensual (producto Advance Income, DW).
 * `productValueList` es un arreglo anidado y los valores vienen en miles.
 * Las tres primeras posiciones son promedio, limite inferior y superior.
 */
function leerIngresoEstimado(lista: DcProductValue[][] | undefined) {
  const registros = (lista ?? []).flat().filter((item) => codigo(item?.productCode).toUpperCase() === 'DW')
  if (registros.length === 0) return null

  // `reason` llega con relleno ('0053'), de ahi el Number() en vez de comparar cadenas.
  const razonCruda = Number(codigo(registros[0]?.reason))
  const razon = Number.isFinite(razonCruda) ? razonCruda : null
  const excluido = razon !== null && razon in RAZONES_EXCLUSION_INGRESO

  const positivo = (value: number | null | undefined) => {
    const parsed = num(value)
    return parsed !== null && parsed > 0 ? parsed : null
  }

  return {
    excluido,
    razon,
    promedio: excluido ? null : positivo(registros[0]?.value),
    minimo: excluido ? null : positivo(registros[1]?.value),
    maximo: excluido ? null : positivo(registros[2]?.value),
  }
}

/** Hay algo de identidad que mostrar. */
function seccionTitularDisponible(report: DcReport): boolean {
  return Boolean(report.basicInformation || report.location?.nationalNatural?.identification)
}

// ── Accordion Section ───────────────────────────────────────

function AccordionSection({
  title,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {badge}
        </div>
        {open ? (
          <IconChevronUp size={16} className="text-gray-400" />
        ) : (
          <IconChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function EstadoPill({ texto, tono }: { texto: string; tono: 'green' | 'red' | 'gray' }) {
  const clases =
    tono === 'red'
      ? 'bg-red-100 text-red-700'
      : tono === 'green'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-600'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${clases}`}>
      {texto}
    </span>
  )
}

// ── Main Component ──────────────────────────────────────────

export function DataCreditoReportDetail({ data }: DataCreditoReportDetailProps) {
  // El provider persiste la respuesta con su envoltura: { ReportHDCplus: {...} }.
  // Se tolera tambien el reporte pelado por si algun dia se guarda desenvuelto.
  const report: DcReport = data?.ReportHDCplus ?? (data as DcReport) ?? {}

  // Las obligaciones negativas nunca deben quedar ocultas tras el truncado.
  const [verTodasObligaciones, setVerTodasObligaciones] = useState(false)

  const productResult = report.productResult
  const basica = report.basicInformation
  const identificacionBasica = basica?.identification
  const nacional = report.location?.nationalNatural
  const identificacion = nacional?.identification

  // El servicio emite la clave a minuscula; el manual la documenta capitalizada.
  const agregado = report.agregatedInfo ?? report.AgregatedInfo
  const overview = agregado?.overview
  const principals = overview?.principals ?? overview?.PrincipalsAgregatedInfo
  const balances = overview?.balances ?? overview?.BalancesAgregatedInfo

  const liabilities = report.liabilities ?? []
  const creditCard = report.creditCard ?? []
  const globalIndebtedness = report.globalIndebtedness ?? []
  const huellas = report.inquiryFootprints ?? []

  // Tabla 44: la seccion mezcla origenes ('S' Superintendencia, 'DC'
  // Datacredito). El badge se deriva de las filas presentes en vez de
  // atribuirlas todas a la Superintendencia.
  const fuentesEndeudamiento = Array.from(
    new Set(globalIndebtedness.map((item) => codigo(item?.sourceGlobalIndebtedness).toUpperCase()).filter(Boolean))
  ).sort((a, b) => (a === 'S' ? -1 : b === 'S' ? 1 : a.localeCompare(b)))
  const badgeEndeudamiento =
    fuentesEndeudamiento
      .map((fuente) =>
        fuente === 'S' ? 'Superintendencia Financiera' : fuente === 'DC' ? 'DataCrédito' : fuente
      )
      .join(' y ') || 'Origen no reportado'

  const codigoConsulta = codigoRespuesta(productResult?.responseCode)
  const tieneDetalle = liabilities.length > 0 || creditCard.length > 0
  const tieneConsolidado = Boolean(principals || balances)
  // Codigo 14: la consulta fue efectiva pero el buro no tiene historia
  // crediticia de la persona. No es un rechazo. El aviso solo se muestra si
  // hubo respuesta del proveedor: sin `productResult` no se puede afirmar
  // que la consulta fuera efectiva.
  const respondio = Boolean(productResult)
  const sinInformacion = respondio && (codigoConsulta === '14' || (!tieneDetalle && !tieneConsolidado))
  // El reporte no trae absolutamente nada renderizable.
  const reporteVacio = !respondio && !seccionTitularDisponible(report) && !tieneDetalle && !tieneConsolidado

  // Fecha de corte real de los datos, distinta de la fecha de la consulta.
  const fechaCorte =
    balances?.month?.[0]?.behaviourDate ?? overview?.behavior?.month?.[0]?.behaviourDate ?? null

  // Score: 0 significa ausencia de score, no score cero.
  // Solo el modelo 'DF' (Advance 1.1) decide el expediente: es el unico que lee
  // el provider al calcular `estudio.score`. Sin fallback a otros modelos, que
  // mostrarian un numero distinto al del medidor de la misma pantalla.
  const modelo = (report.models ?? []).find((m) => codigo(m?.modelCode).toUpperCase() === 'DF')
  const scoreCrudo = num(modelo?.scoreValue)
  const score = scoreCrudo === 0 ? null : scoreCrudo
  const nombreModelo = MODELOS_SCORE[codigo(modelo?.modelCode).toUpperCase()] ?? limpiar(modelo?.modelCodeDesc)

  const ingreso = leerIngresoEstimado(report.productValueList)

  // Obligaciones: cartera y tarjetas en una sola tabla.
  // `item?.` porque un elemento nulo en el arreglo tumbaria el render entero.
  const obligaciones = [
    ...liabilities.map((item) => ({
      account: item?.account,
      status: item?.status,
      values: item?.values?.[0] as DcAccountValues | undefined,
    })),
    ...creditCard.map((item) => ({
      account: item?.account,
      status: item?.status,
      values: item?.values?.[0] as DcAccountValues | undefined,
    })),
  ]
  const esVigente = (item: (typeof obligaciones)[number]) =>
    ESTADOS_ABIERTOS.has(codigoCatalogo(item.status?.account?.businessAccountStatus)) &&
    !EVENTOS_CIERRE.has(codigoCatalogo(item.status?.payment?.businessBureauEvent))
  // Deterioro: estado negativo de la Tabla 41 o mora efectiva en importes/dias.
  const esNegativa = (item: (typeof obligaciones)[number]) =>
    ESTADOS_NEGATIVOS.has(codigoCatalogo(item.status?.account?.businessAccountStatus)) ||
    (num(item.values?.businessValueBalanceOverdue) ?? 0) > 0 ||
    (num(item.values?.delinquencyMaturation) ?? 0) > 0
  // El historial negativo es lo que sustenta un condicionado: va primero, para
  // que nunca quede fuera de las filas visibles.
  const rango = (item: (typeof obligaciones)[number]) => (esNegativa(item) ? 0 : esVigente(item) ? 1 : 2)
  const obligacionesOrdenadas = [...obligaciones].sort((a, b) => rango(a) - rango(b))
  const totalVigentes = obligaciones.filter(esVigente).length
  const totalNegativas = obligaciones.filter(esNegativa).length

  const vigentes = num(principals?.currentCredits)
  const negativos = num(principals?.currentNegativeCredits)
  const alDia = vigentes !== null && negativos !== null ? Math.max(vigentes - negativos, 0) : null
  const valorMora = num(balances?.totalValueBalanceOverdue)
  const cuotaMensual = num(balances?.valueMonthlyPayment)
  const creditoMasAlto = num(balances?.HightestDebtBalance ?? balances?.hightestDebtBalance)
  const negativos12Meses = num(principals?.negativeHistoricalLast12Months)
  const anios = aniosDesde(principals?.maturationSince)

  // Meses con mora en el vector consolidado de 24 meses: 'N' es al dia y
  // '-' / ' ' significan "sin informacion", no mora.
  const mesesVector = overview?.behavior?.month ?? []
  const mesesConMora = mesesVector.filter((mes) => {
    const marca = codigo(mes?.behaviour).toUpperCase()
    return marca !== '' && marca !== 'N' && marca !== '-'
  }).length

  // Cuota comprometida sobre el ingreso estimado: ambas magnitudes en miles.
  // El ingreso es un punto medio con banda de +/-25%, asi que el ratio se
  // publica como rango: contra el maximo da el piso y contra el minimo el techo.
  const porcentajeCuota = (ingresoBase: number | null | undefined) =>
    cuotaMensual !== null && ingresoBase ? Math.round((cuotaMensual / ingresoBase) * 100) : null
  const cargaIngreso = porcentajeCuota(ingreso?.promedio)
  const cargaIngresoPiso = porcentajeCuota(ingreso?.maximo)
  const cargaIngresoTecho = porcentajeCuota(ingreso?.minimo)

  const nombreTitular = limpiar(basica?.fullName)
  const documentoTitular = num(basica?.personId?.personIdNumber ?? identificacion?.personId?.personIdNumber)
  const tipoDocumento = TIPOS_DOCUMENTO[codigoCatalogo(basica?.personId?.personIdType)] ?? null
  const codigoEstadoDocumento = codigoCatalogo(identificacionBasica?.statusId ?? identificacion?.statusId)
  const estadoDocumento =
    limpiar(identificacion?.statusDesc) ?? estadoDocumentoTabla2(codigoEstadoDocumento)
  // El tono sale del codigo, no del texto: cualquier estado distinto de '00'
  // (cancelada, fallecida, no expedida, en tramite) se pinta en rojo.
  const tonoEstadoDocumento: 'green' | 'red' = codigoEstadoDocumento
    ? codigoEstadoDocumento === '00'
      ? 'green'
      : 'red'
    : estadoDocumento === 'VIGENTE'
      ? 'green'
      : 'red'
  const rangoEdad =
    limpiar(nacional?.age?.minDesc) ??
    (basica?.age?.min != null && basica?.age?.max != null ? `${basica.age.min} - ${basica.age.max}` : null)
  const ciudadExpedicion = limpiar(
    identificacionBasica?.issuingCityName ?? identificacion?.issuingCityName
  )
  const departamentoExpedicion = limpiar(
    identificacionBasica?.issuingStateName ?? identificacion?.issuingStateName
  )
  const lugarExpedicion = [ciudadExpedicion, departamentoExpedicion].filter(Boolean).join(', ') || null
  const fechaExpedicion = identificacionBasica?.issueDate ?? identificacion?.issueDate

  const seccionTitular = basica || identificacion

  return (
    <div className="space-y-3">
      {/* Trazabilidad: la consulta y el corte de los datos no son la misma fecha */}
      {(productResult?.consultDate || fechaCorte) && (
        <p className="text-[10px] text-gray-400">
          Consulta del {formatDate(productResult?.consultDate)}
          {fechaCorte ? ` · Datos con corte a ${formatDate(fechaCorte)}` : ''}
          {productResult?.securityCode ? ` · Código ${productResult.securityCode}` : ''}
        </p>
      )}

      {/* Reporte sin contenido: no se afirma nada sobre la consulta */}
      {reporteVacio && (
        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          El reporte del buró no trae información para mostrar.
        </p>
      )}

      {/* Aviso de codigo 14: efectiva pero sin historia crediticia */}
      {sinInformacion && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <IconInfo size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-900">
              La consulta fue efectiva, pero DataCrédito no reporta información crediticia de esta persona.
            </p>
            <p className="text-[10px] text-blue-800 mt-1">
              No es un rechazo del buró: significa que la persona no está bancarizada o no tiene historia por
              este canal. El expediente requiere evaluación manual con otros soportes (ingresos, referencias,
              codeudor).
              {limpiar(productResult?.responseDesc)
                ? ` Respuesta del proveedor: ${limpiar(productResult?.responseDesc)}.`
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* Sección 1: Datos del titular */}
      {seccionTitular && (
        <AccordionSection title="Datos del titular" defaultOpen>
          <div className="space-y-0">
            <InfoRow label="Nombre" value={nombreTitular ?? '—'} />
            <InfoRow
              label="Documento"
              value={
                documentoTitular !== null
                  ? `${tipoDocumento ? `${tipoDocumento} ` : ''}${formatEntero(documentoTitular)}`
                  : '—'
              }
            />
            <InfoRow
              label="Estado del documento"
              value={
                estadoDocumento ? (
                  <EstadoPill texto={estadoDocumento} tono={tonoEstadoDocumento} />
                ) : (
                  '—'
                )
              }
            />
            <InfoRow
              label="Validado en fuente oficial"
              value={
                basica?.officialSourceValidationStatus === true
                  ? 'Sí, Registraduría'
                  : basica?.officialSourceValidationStatus === false
                    ? 'No'
                    : '—'
              }
            />
            <InfoRow label="Rango de edad" value={rangoEdad ?? '—'} />
            <InfoRow label="Lugar de expedición" value={lugarExpedicion ?? '—'} />
            <InfoRow label="Fecha de expedición" value={formatDate(fechaExpedicion)} />
            {/* El genero no se muestra: no aporta a la capacidad de pago, la
                Tabla 19 lo mezcla con estado civil y es un vector clasico de
                discriminacion en arrendamiento (Ley 1266, art. 4 lit. b). */}
            {basica?.citizenTaxRegistrationIndicator === true && (
              <InfoRow label="Cédula con historia como NIT" value="Sí, registra actividad comercial" />
            )}
          </div>
        </AccordionSection>
      )}

      {/* Sección 2: Resumen crediticio */}
      {tieneConsolidado && (
        <AccordionSection
          title="Resumen crediticio"
          defaultOpen
          badge={<span className="text-[10px] text-gray-400 font-normal">Consolidado general</span>}
        >
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Créditos vigentes" value={formatEntero(vigentes)} isNumber />
            <SummaryCard label="Al día" value={formatEntero(alDia)} isNumber color="green" />
            <SummaryCard
              label="En mora"
              value={formatEntero(negativos)}
              isNumber
              color={negativos !== null && negativos > 0 ? 'red' : 'green'}
            />
            <SummaryCard
              label="Valor en mora"
              value={formatCOP(valorMora, MILES)}
              color={valorMora !== null && valorMora > 0 ? 'red' : 'green'}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <InfoRow label="Saldo total" value={formatCOP(balances?.totaldebtBalance, MILES)} />
            <InfoRow label="Cuota mensual comprometida" value={formatCOP(cuotaMensual, MILES)} />
            <InfoRow
              label="Ingreso mensual estimado"
              value={
                ingreso?.promedio ? (
                  <span>
                    {formatCOP(ingreso.promedio, MILES)}
                    {ingreso.minimo && ingreso.maximo && (
                      <span className="text-[10px] text-gray-400 font-normal">
                        {' '}
                        · rango {formatCOP(ingreso.minimo, MILES)} a {formatCOP(ingreso.maximo, MILES)}
                      </span>
                    )}
                  </span>
                ) : ingreso?.excluido ? (
                  <span
                    className={
                      ingreso.razon === RAZON_INGRESO_FALLECIDO
                        ? 'text-red-700'
                        : 'text-gray-500 font-normal'
                    }
                  >
                    {(ingreso.razon !== null ? RAZONES_EXCLUSION_INGRESO[ingreso.razon] : null) ??
                      'No estimable para este perfil'}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            {cargaIngreso !== null && (
              <InfoRow
                label="Cuota sobre ingreso estimado"
                value={
                  <span className="text-gray-900">
                    {cargaIngreso}%
                    {cargaIngresoPiso !== null && cargaIngresoTecho !== null && (
                      <span className="text-[10px] text-gray-400 font-normal">
                        {' '}
                        · entre {cargaIngresoPiso}% y {cargaIngresoTecho}% según el rango del ingreso
                      </span>
                    )}
                  </span>
                }
              />
            )}
            {/* `saldoCreditoMasAlto` en PATH.xlsx: es el SALDO de la obligacion
                con mayor saldo vigente, no el monto otorgado ni el cupo. */}
            <InfoRow label="Mayor saldo individual" value={formatCOP(creditoMasAlto, MILES)} />
            <InfoRow
              label="Saldo en mora 30 / 60 / 90 días"
              value={`${formatCOP(balances?.debtBalanceD30, MILES)} / ${formatCOP(
                balances?.debtBalanceD60,
                MILES
              )} / ${formatCOP(balances?.debtBalanceD90, MILES)}`}
            />
            <InfoRow
              label="Negativos últimos 12 meses"
              value={
                <span className={negativos12Meses !== null && negativos12Meses > 0 ? 'text-red-700' : 'text-gray-900'}>
                  {formatEntero(negativos12Meses)}
                </span>
              }
            />
            {mesesVector.length > 0 && (
              <InfoRow
                label={`Meses con mora (últimos ${mesesVector.length})`}
                value={
                  <span className={mesesConMora > 0 ? 'text-red-700' : 'text-gray-900'}>{mesesConMora}</span>
                }
              />
            )}
            <InfoRow
              label="Antigüedad crediticia"
              value={
                principals?.maturationSince
                  ? `${formatDate(principals.maturationSince)}${anios !== null ? ` · ${anios} años` : ''}`
                  : '—'
              }
            />
            <InfoRow label="Obligaciones cerradas" value={formatEntero(principals?.closedCredits)} />
            <InfoRow
              label="Consultas últimos 6 meses"
              value={formatEntero(principals?.consultedLast6Months)}
            />
            {modelo && (
              <InfoRow
                label={`Score${nombreModelo ? ` (${nombreModelo})` : ''}`}
                value={score !== null ? formatEntero(score) : 'Sin score'}
              />
            )}
          </div>

          <p className="text-[10px] text-gray-400 mt-2">
            Montos consolidados convertidos desde miles de pesos, como los entrega el proveedor.
            {score !== null
              ? ' Los cortes de puntaje del modelo son provisionales: Experian no publica el rango oficial.'
              : ''}
          </p>
        </AccordionSection>
      )}

      {/* Sección 3: Obligaciones */}
      {obligacionesOrdenadas.length > 0 && (
        <AccordionSection
          title="Obligaciones"
          badge={
            <span className="text-[10px] text-gray-400 font-normal">
              {totalVigentes} vigentes de {obligacionesOrdenadas.length}
              {totalNegativas > 0 && (
                <span className="text-red-600"> · {totalNegativas} con historial negativo</span>
              )}
            </span>
          }
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Entidad</th>
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500">Saldo</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500">Cuota</th>
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Estado</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500">Mora</th>
                </tr>
              </thead>
              <tbody>
                {(verTodasObligaciones
                  ? obligacionesOrdenadas
                  : obligacionesOrdenadas.slice(0, MAX_FILAS)
                ).map((item, idx) => {
                  const estado = codigoCatalogo(item.status?.account?.businessAccountStatus)
                  const estadoTexto =
                    limpiar(item.status?.account?.businessAccountStatusDesc) ??
                    limpiar(item.status?.payment?.businessBureauEventDesc) ??
                    '—'
                  // Verde solo si la cuenta sigue realmente abierta: hay
                  // entidades que dejan `businessAccountStatus` en '01' sobre
                  // obligaciones que el evento de pago ya declaro cerradas.
                  const tono: 'green' | 'red' | 'gray' = ESTADOS_NEGATIVOS.has(estado)
                    ? 'red'
                    : estado === '01' && esVigente(item)
                      ? 'green'
                      : 'gray'
                  const valorMoraCuenta = num(item.values?.businessValueBalanceOverdue)
                  const diasMora = num(item.values?.delinquencyMaturation)
                  const enMora = (valorMoraCuenta !== null && valorMoraCuenta > 0) || (diasMora !== null && diasMora > 0)

                  return (
                    <tr key={item.account?.primaryKey ?? idx} className="border-b border-gray-50">
                      <td className="py-1.5 px-1 text-gray-700">{nombreEntidad(item.account)}</td>
                      <td className="py-1.5 px-1 text-gray-700">{tipoObligacion(item.account)}</td>
                      <td className="py-1.5 px-1 text-right text-gray-900">
                        {formatCOP(item.values?.debtBalance)}
                      </td>
                      <td className="py-1.5 px-1 text-right text-gray-900">
                        {formatCOP(item.values?.valueMonthlyPayment)}
                      </td>
                      <td className="py-1.5 px-1">
                        <EstadoPill texto={estadoTexto} tono={tono} />
                      </td>
                      <td className={`py-1.5 px-1 text-right ${enMora ? 'text-red-700 font-medium' : 'text-gray-900'}`}>
                        {enMora
                          ? `${formatCOP(valorMoraCuenta)}${diasMora !== null && diasMora > 0 ? ` · ${diasMora} d` : ''}`
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {obligacionesOrdenadas.length > MAX_FILAS && (
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => setVerTodasObligaciones(!verTodasObligaciones)}
                className="text-[11px] font-medium text-primary-700 hover:text-primary-800 hover:underline"
              >
                {verTodasObligaciones
                  ? 'Ver solo las primeras obligaciones'
                  : `Ver las ${plural(
                      obligacionesOrdenadas.length - MAX_FILAS,
                      'obligación restante',
                      'obligaciones restantes'
                    )}`}
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-2">
            Saldo, cuota y mora en pesos. Las obligaciones ya canceladas no reportan importes: se muestran con
            guion.
          </p>
        </AccordionSection>
      )}

      {/* Sección 4: Endeudamiento global */}
      {globalIndebtedness.length > 0 && (
        <AccordionSection
          title="Endeudamiento global"
          badge={<span className="text-[10px] text-gray-400 font-normal">{badgeEndeudamiento}</span>}
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Corte</th>
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Entidad</th>
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Tipo</th>
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Fuente</th>
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Calif.</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500">Capital</th>
                </tr>
              </thead>
              <tbody>
                {globalIndebtedness.slice(0, MAX_FILAS).map((item: DcGlobalIndebtedness, idx: number) => {
                  const calificacion = limpiar(item?.quarterQualification)
                  return (
                    <tr key={item?.primaryKey ?? idx} className="border-b border-gray-50">
                      <td className="py-1.5 px-1 text-gray-700">{formatDate(item?.cutoffDate)}</td>
                      <td className="py-1.5 px-1 text-gray-700">
                        {limpiar(item?.entity?.businessLineName) ?? '—'}
                      </td>
                      <td className="py-1.5 px-1 text-gray-700">
                        {limpiar(item?.typeOfCreditDesc) ?? limpiar(item?.typeOfCredit) ?? '—'}
                      </td>
                      <td className="py-1.5 px-1 text-gray-700">
                        {limpiar(item?.sourceGlobalIndebtednessDesc) ??
                          limpiar(item?.sourceGlobalIndebtedness) ??
                          '—'}
                      </td>
                      <td className="py-1.5 px-1 text-gray-700">{calificacion ?? '—'}</td>
                      <td className="py-1.5 px-1 text-right text-gray-900">{formatCOP(item?.capitalValue)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {globalIndebtedness.length > MAX_FILAS && (
            <p className="text-[10px] text-gray-400 text-center mt-2">
              y {plural(globalIndebtedness.length - MAX_FILAS, 'registro más', 'registros más')}...
            </p>
          )}
        </AccordionSection>
      )}

      {/* Sección 5: Huella de consulta */}
      {huellas.length > 0 && (
        <AccordionSection
          title="Huella de consulta"
          badge={
            <span className="text-[10px] text-gray-400 font-normal">
              {plural(huellas.length, 'registrada', 'registradas')}
            </span>
          }
        >
          <div className="space-y-2">
            {huellas.slice(0, MAX_CONSULTAS).map((consulta: DcInquiryFootprint, idx: number) => {
              const detalle = [limpiar(consulta?.economicSectorName), limpiar(consulta?.inquiryReasonDesc)]
                .filter(Boolean)
                .join(' · ')
              return (
                <div
                  key={consulta?.primaryKey ? `${consulta.primaryKey}-${idx}` : idx}
                  className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      {limpiar(consulta?.inquiryBusinessName) ?? 'Entidad desconocida'}
                    </p>
                    <p className="text-[10px] text-gray-400">{detalle}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                    {formatDate(consulta?.inquiryDate)}
                  </span>
                </div>
              )
            })}
            {huellas.length > MAX_CONSULTAS && (
              <p className="text-[10px] text-gray-400 text-center">
                y {plural(huellas.length - MAX_CONSULTAS, 'consulta más', 'consultas más')}...
              </p>
            )}
          </div>
        </AccordionSection>
      )}
    </div>
  )
}

// ── Summary Card ────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
  isNumber,
}: {
  label: string
  value: string
  color?: 'green' | 'red'
  isNumber?: boolean
}) {
  const colorClasses = color === 'red'
    ? 'text-red-700 bg-red-50 border-red-100'
    : color === 'green'
      ? 'text-green-700 bg-green-50 border-green-100'
      : 'text-gray-700 bg-gray-50 border-gray-100'

  return (
    <div className={`rounded-lg border p-2.5 ${colorClasses}`}>
      <p className="text-[10px] opacity-70 mb-0.5">{label}</p>
      <p className={`${isNumber ? 'text-lg' : 'text-sm'} font-bold`}>{value}</p>
    </div>
  )
}
