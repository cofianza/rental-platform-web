/**
 * Migración de cartera — backoffice de Cofianza (/admin/migracion; administrador y
 * analista). Las subidas (xlsx, PDF) y las descargas de Excel van por
 * apiClient.raw (sin JSON); mismo token, renovación y mapeo de errores.
 */

import { apiClient, type ApiResponse } from '@/lib/api'
import type {
  AuditoriaAbierta,
  ActaEnviada,
  ActaPdf,
  ArchivoDescargado,
  CorreccionBody,
  CorreccionLote,
  Destinacion,
  DetalleFilaExcluida,
  DetalleFilaMigrada,
  DocumentoDiferido,
  EstadoActaLote,
  EstadoMigracionOrg,
  FilaFormatoAnterior,
  GuardarHabilitacionBody,
  Habilitacion,
  InmobiliariaMigracion,
  LiquidacionMigracion,
  LoteResumen,
  MotivoReportable,
  PersonaDiferida,
  ProcesarResultado,
  RepresentanteLegal,
  ResultadoAuditoria,
  SuspensionResultado,
  TableroLote,
  TipoDocumentoHabilitacion,
  ValidacionResultado,
  VistaTablero,
} from '@/types/migracion'

const BASE = '/admin/migracion'
const org = (inmobiliariaId: string) => `${BASE}/inmobiliarias/${inmobiliariaId}`

const qs = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString()
  return q ? `?${q}` : ''
}

const crudo = (path: string, init: { method?: string; form?: FormData } = {}): Promise<Response> =>
  apiClient.raw(path, { method: init.method ?? 'GET', body: init.form })

const json = async <T>(res: Response) => ((await res.json()) as ApiResponse<T>).data

// El nombre se arma aquí (el mismo que pone la API): CORS no expone Content-Disposition.
export const descargar = async (path: string, nombre: string, form?: FormData): Promise<ArchivoDescargado> => ({
  blob: await (await crudo(path, form ? { method: 'POST', form } : {})).blob(),
  nombre,
})

/** Valida un PDF antes de subirlo (la API corta en 20 MB con un 500 genérico). Devuelve el error o null. */
export function errorPdf(f: File): string | null {
  if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) return 'El archivo debe ser un PDF.'
  if (f.size > 20 * 1024 * 1024) return 'El PDF supera 20 MB.'
  return null
}

/** Dispara la descarga en el navegador. */
export function guardarArchivo({ blob, nombre }: ArchivoDescargado) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

const conArchivo = (archivo: File, campos: Record<string, string> = {}) => {
  const form = new FormData()
  for (const [k, v] of Object.entries(campos)) form.append(k, v)
  form.append('archivo', archivo)
  return form
}

export const migracionService = {
  descargarPlantilla: () => descargar(`${BASE}/plantilla`, 'plantilla-migracion-cartera.xlsx'),

  // ── Habilitación de la inmobiliaria (§1.1) y suspensión (§7.2.2) ──

  /** Inmobiliarias no cerradas con habilitaciones y suspensión (administrador y analista). */
  async listarInmobiliarias(): Promise<InmobiliariaMigracion[]> {
    return (await apiClient.get<InmobiliariaMigracion[]>(`${BASE}/inmobiliarias`)).data
  },
  async estadoOrg(inmobiliariaId: string): Promise<EstadoMigracionOrg> {
    return (await apiClient.get<EstadoMigracionOrg>(org(inmobiliariaId))).data
  },
  async guardarHabilitacion(inmobiliariaId: string, destinacion: Destinacion, body: GuardarHabilitacionBody): Promise<Habilitacion> {
    return (await apiClient.put<Habilitacion>(`${org(inmobiliariaId)}/habilitaciones/${destinacion}`, body)).data
  },
  /** PDF: la plantilla de contrato revisada o el convenio de migración firmado. */
  async cargarDocumento(
    inmobiliariaId: string,
    destinacion: Destinacion,
    tipo: TipoDocumentoHabilitacion,
    archivo: File,
  ): Promise<Habilitacion> {
    const path = `${org(inmobiliariaId)}/habilitaciones/${destinacion}/documentos/${tipo}`
    return json<Habilitacion>(await crudo(path, { method: 'POST', form: conArchivo(archivo) }))
  },
  async suspender(inmobiliariaId: string, motivo: string): Promise<SuspensionResultado> {
    return (await apiClient.post<SuspensionResultado>(`${org(inmobiliariaId)}/suspension`, { motivo })).data
  },
  /** Solo la Gerencia General (403 SOLO_GERENCIA_GENERAL para los demás). */
  async reactivar(inmobiliariaId: string): Promise<{ suspendida: false }> {
    return (await apiClient.delete<{ suspendida: false }>(`${org(inmobiliariaId)}/suspension`)).data
  },

  // ── Carga del archivo (§2.4) ──

  // conMora (Adenda 1 §4.4): códigos internos de los contratos que la inmobiliaria declara con
  // mora, separados por coma o renglón; la API los rechaza (400 si alguno no está en el archivo).

  /** Primera pasada: no crea nada. */
  async validar(inmobiliariaId: string, archivo: File, conMora = ''): Promise<ValidacionResultado> {
    const form = conArchivo(archivo, { contratos_con_mora: conMora })
    return json<ValidacionResultado>(await crudo(`${org(inmobiliariaId)}/validar`, { method: 'POST', form }))
  },
  /** El mismo reporte de validación en Excel, con los datos tal como llegaron. */
  validarXlsx: (inmobiliariaId: string, archivo: File, conMora = '') =>
    descargar(
      `${org(inmobiliariaId)}/validar?formato=xlsx`,
      'reporte-validacion-migracion.xlsx',
      conArchivo(archivo, { contratos_con_mora: conMora }),
    ),
  /** Crea el lote y su Acta de Migración (422 MIGRACION_SIN_ACEPTADAS si nada es aceptable). */
  async procesar(inmobiliariaId: string, archivo: File, rep: RepresentanteLegal, conMora = ''): Promise<ProcesarResultado> {
    const form = conArchivo(archivo, { ...rep, contratos_con_mora: conMora })
    return json<ProcesarResultado>(await crudo(`${org(inmobiliariaId)}/procesar`, { method: 'POST', form }))
  },

  // ── Acta y lote (§3) ──

  async enviarActa(loteId: string): Promise<ActaEnviada> {
    return (await apiClient.post<ActaEnviada>(`${BASE}/lotes/${loteId}/acta/enviar`)).data
  },
  async estadoActa(loteId: string): Promise<EstadoActaLote> {
    return (await apiClient.get<EstadoActaLote>(`${BASE}/lotes/${loteId}/acta`)).data
  },
  /** PDF del acta: la firmada si ya existe, si no la generada (404 MIGRACION_SIN_ACTA). */
  async actaPdf(loteId: string): Promise<ActaPdf> {
    return (await apiClient.get<ActaPdf>(`${BASE}/lotes/${loteId}/acta/pdf`)).data
  },
  /** Reconcilia con Auco y devuelve el estado. */
  async actualizarActa(loteId: string): Promise<EstadoActaLote> {
    return (await apiClient.post<EstadoActaLote>(`${BASE}/lotes/${loteId}/acta/actualizar`)).data
  },
  /** Antes de la firma: anula el acta en Auco y libera los inmuebles del lote. */
  async cancelarLote(loteId: string): Promise<EstadoActaLote> {
    return (await apiClient.post<EstadoActaLote>(`${BASE}/lotes/${loteId}/cancelar`)).data
  },

  // ── Acta de corrección de contratos activos (§3.8) ──

  /** Genera el acta y la envía a firma por Auco; nada cambia hasta que se firma. */
  async proponerCorreccion(loteId: string, body: CorreccionBody): Promise<CorreccionLote> {
    return (await apiClient.post<CorreccionLote>(`${BASE}/lotes/${loteId}/correcciones`, body)).data
  },
  /** La más reciente primero. */
  async listarCorrecciones(loteId: string): Promise<CorreccionLote[]> {
    return (await apiClient.get<CorreccionLote[]>(`${BASE}/lotes/${loteId}/correcciones`)).data
  },
  /** La firmada si existe; si no, la generada. */
  async actaCorreccionPdf(correccionId: string): Promise<ActaPdf> {
    return (await apiClient.get<ActaPdf>(`${BASE}/correcciones/${correccionId}/pdf`)).data
  },
  /** Reconcilia con Auco; si quedó firmada, la aplica. */
  async actualizarCorreccion(correccionId: string): Promise<void> {
    await apiClient.post(`${BASE}/correcciones/${correccionId}/actualizar`)
  },
  async cancelarCorreccion(correccionId: string): Promise<void> {
    await apiClient.post(`${BASE}/correcciones/${correccionId}/cancelar`)
  },

  // ── Lotes, tablero y reportes (§8, §4.7) ──

  async listarLotes(inmobiliariaId?: string): Promise<LoteResumen[]> {
    return (await apiClient.get<LoteResumen[]>(`${BASE}/lotes${qs({ inmobiliariaId })}`)).data
  },
  async tablero(loteId: string): Promise<TableroLote> {
    return (await apiClient.get<TableroLote>(`${BASE}/lotes/${loteId}/tablero`)).data
  },
  /** vista 'inmobiliaria' omite las columnas internas de Cofianza (§8.3). */
  tableroXlsx: (loteId: string, vista: VistaTablero = 'cofianza') =>
    descargar(`${BASE}/lotes/${loteId}/tablero${qs({ formato: 'xlsx', vista })}`, `tablero-migracion-${loteId}.xlsx`),
  async reporteFormatoAnterior(inmobiliariaId?: string): Promise<FilaFormatoAnterior[]> {
    return (await apiClient.get<FilaFormatoAnterior[]>(`${BASE}/reportes/formato-anterior${qs({ inmobiliariaId })}`)).data
  },
  reporteFormatoAnteriorXlsx: (inmobiliariaId?: string) =>
    descargar(`${BASE}/reportes/formato-anterior${qs({ formato: 'xlsx', inmobiliariaId })}`, 'migracion-formato-anterior.xlsx'),
  /** mes = AAAA-MM. */
  async liquidacion(mes: string, inmobiliariaId?: string): Promise<LiquidacionMigracion> {
    return (await apiClient.get<LiquidacionMigracion>(`${BASE}/reportes/liquidacion${qs({ mes, inmobiliariaId })}`)).data
  },
  liquidacionXlsx: (mes: string, inmobiliariaId?: string) =>
    descargar(`${BASE}/reportes/liquidacion${qs({ formato: 'xlsx', mes, inmobiliariaId })}`, `liquidacion-migracion-${mes}.xlsx`),

  // ── Contrato migrado (§5-§7) ──

  async detalleFila(filaId: string): Promise<DetalleFilaMigrada> {
    return (await apiClient.get<DetalleFilaMigrada>(`${BASE}/filas/${filaId}`)).data
  },
  async marcarRevision(filaId: string, enRevision: boolean, motivo?: string | null): Promise<DetalleFilaMigrada> {
    return (await apiClient.put<DetalleFilaMigrada>(`${BASE}/filas/${filaId}/revision`, { en_revision: enRevision, motivo })).data
  },
  /** Exclusión directa: solo por declaración falsa verificada (§7.2.1); suspende la inmobiliaria. */
  async excluir(filaId: string, nota?: string | null): Promise<DetalleFilaExcluida> {
    return (await apiClient.post<DetalleFilaExcluida>(`${BASE}/filas/${filaId}/exclusion`, { nota })).data
  },
  /** fecha = AAAA-MM-DD de la autorización (por defecto hoy); la tarifa baja desde el mes siguiente. */
  async pasarAReportable(
    filaId: string,
    body: { motivo: MotivoReportable; fecha?: string | null; notas?: string | null },
  ): Promise<DetalleFilaMigrada> {
    return (await apiClient.post<DetalleFilaMigrada>(`${BASE}/filas/${filaId}/reportable`, body)).data
  },
  /** Adenda 1 §7: registra el documento del arrendatario pendiente; la fianza se activa en ese momento. */
  async identificar(filaId: string, body: { tipo_documento: string; numero_documento: string }): Promise<DetalleFilaMigrada> {
    return (await apiClient.post<DetalleFilaMigrada>(`${BASE}/filas/${filaId}/identificacion`, body)).data
  },
  /** Adenda 1 §3: datos que la inmobiliaria entrega tras una mora. coarrendatarios [] = constancia de que no hay. */
  async registrarDiferidos(
    filaId: string,
    body: { celular?: string; correo?: string; coarrendatarios?: PersonaDiferida[] },
  ): Promise<DetalleFilaMigrada> {
    return (await apiClient.put<DetalleFilaMigrada>(`${BASE}/filas/${filaId}/diferidos`, body)).data
  },
  async cargarDiferido(filaId: string, documento: DocumentoDiferido, archivo: File): Promise<DetalleFilaMigrada> {
    return json<DetalleFilaMigrada>(await crudo(`${BASE}/filas/${filaId}/diferidos/${documento}`, { method: 'POST', form: conArchivo(archivo) }))
  },
  /** Enlace firmado de 10 minutos al PDF entregado. */
  async verDiferido(filaId: string, documento: DocumentoDiferido): Promise<{ url: string }> {
    return (await apiClient.get<{ url: string }>(`${BASE}/filas/${filaId}/diferidos/${documento}`)).data
  },
  /** §7.3.4: auditorías sin resultado, la que vence primero arriba. */
  async auditoriasAbiertas(): Promise<AuditoriaAbierta[]> {
    return (await apiClient.get<AuditoriaAbierta[]>(`${BASE}/auditorias`)).data
  },
  async requerirAuditoria(filaId: string, notas?: string | null): Promise<DetalleFilaMigrada> {
    return (await apiClient.post<DetalleFilaMigrada>(`${BASE}/filas/${filaId}/auditorias`, { notas })).data
  },
  /** Respuesta de la inmobiliaria: soporte PDF opcional (se pueden cargar varios, uno por llamada). */
  async responderAuditoria(auditoriaId: string, archivo?: File | null, notas?: string | null): Promise<DetalleFilaMigrada> {
    const form = new FormData()
    if (notas) form.append('notas', notas)
    if (archivo) form.append('archivo', archivo)
    return json<DetalleFilaMigrada>(await crudo(`${BASE}/auditorias/${auditoriaId}/respuesta`, { method: 'POST', form }))
  },
  /** declaracion_falsa y no_entregado excluyen el contrato. */
  async decidirAuditoria(auditoriaId: string, resultado: ResultadoAuditoria, notas?: string | null): Promise<DetalleFilaExcluida> {
    return (await apiClient.post<DetalleFilaExcluida>(`${BASE}/auditorias/${auditoriaId}/decision`, { resultado, notas })).data
  },
}

/** §7.3.3: los soportes llegaron después del plazo (cuenta como no entregados dentro del plazo). */
export const respondidaTarde = (a: { respuesta_en: string | null; vence_en: string }) =>
  !!a.respuesta_en && Date.parse(a.respuesta_en) > Date.parse(a.vence_en)

/**
 * Spec §7.3.2-§7.3.3: pasado el plazo sin soportes recibidos DENTRO de él (sin respuesta o
 * con respuesta tardía): misma regla que la API para «Soportes no entregados».
 */
export const plazoVencido = (a: { respuesta_en: string | null; vence_en: string }) =>
  Date.now() > Date.parse(a.vence_en) && (!a.respuesta_en || respondidaTarde(a))

/** Los códigos que deja la activación del lote (fn_activar_lote_migracion), en palabras. */
const MOTIVOS_REVISION: Record<string, string> = {
  INMUEBLE_OCUPADO: 'el inmueble figuraba ocupado o con otro contrato al activar',
  VENCIDO_ANTES_DE_ACTIVACION: 'el contrato venció antes de la firma del acta',
  CODIGO_INMUEBLE_EXISTENTE: 'el código interno ya era de otro inmueble de la inmobiliaria',
}
export const motivoRevision = (m: string | null | undefined) =>
  m ? m.replace(/\b[A-Z_]{8,}\b/g, (c) => MOTIVOS_REVISION[c] ?? c) : m
