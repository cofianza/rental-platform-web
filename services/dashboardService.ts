// ============================================
// Dashboard Service — HP-359
// Consume endpoints de HP-358
// ============================================

import { apiClient } from '@/lib/api'

// ── Types ───────────────────────────────────

export interface DashboardSummary {
  totalExpedientesActivos: number
  expedientesPorEstado: Record<string, number>
  tasaAprobacion: number
  tiempoPromedioResolucionDias: number
  ingresosDelPeriodo: number
}

export interface ExpedientePorEstado {
  estado: string
  count: number
}

export interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
}

export interface PortfolioStats {
  propiedades_activas: number
  inquilinos_cartera: number
  canon_mensual: number
}

// ── Admin overview (Centro de Control) ──────

export interface AdminOverviewKpis {
  inmobiliariasActivas: number
  contratosActivos: number
  canonTotalMensual: number
  siniestralidad: number
  moraActivaCount: number
  moraActivaMonto: number
  zonaRiesgoCount: number
  zonaRiesgoExposicion: number
  ingresosFianzas: number
  ivaRecaudado: number
  exposicionMaxima: number
  vitrinaPublicados: number
  vitrinaProspectos: number
  capitalLibre: number | null
  // Capital disponible total (para mostrar "de $X" bajo capital libre).
  capitalDisponible: number | null
  desembolsado: number
  ticketsAbiertos: number
  vitrinaVisitasMes: number
}

export interface AdminOverviewConfig {
  // Tarifa plana mensual de afianzamiento por contrato (COP).
  valorAfianzamientoMensual: number
  // IVA de la garantía/fianza (hoy 0 = exento).
  ivaGarantiaPorcentaje: number
}

export interface AdminOverviewContratoItem {
  id: string
  inquilino: string
  inmueble: string
  mes: number
  fechaFin: string | null
  canon: number
}

export interface AdminOverviewMoraItem {
  id: string
  ticketNumero: string
  contratoId: string
  inquilino: string
  inmueble: string
  fase: number
  dias: number
  monto: number
}

export interface AdminOverviewActividadItem {
  id: string
  usuario: string
  accion: string
  entidad: string
  fecha: string
}

export interface AdminOverviewHistItem {
  mes: string
  ct: number
  mr: number
  r: number
}

export interface AdminOverview {
  kpis: AdminOverviewKpis
  config: AdminOverviewConfig
  histSiniestralidad: AdminOverviewHistItem[]
  contratosPorVencer: AdminOverviewContratoItem[]
  contratosZonaRiesgo: AdminOverviewContratoItem[]
  moraActiva: AdminOverviewMoraItem[]
  actividadReciente: AdminOverviewActividadItem[]
  meta: {
    metricasNoDisponibles: string[]
  }
}

export interface TesoreriaConfig {
  capitalDisponible: number
  reservaMinima: number
}

// ── Secciones del Centro de Control ─────────

export interface InmobiliariaRow {
  id: string
  nombre: string
  nit: string | null
  contacto: string | null
  cargoContacto: string | null
  telefono: string | null
  ciudad: string | null
  estado: string
  desde: string
  contratosActivos: number
  canonTotal: number
  moraActivaCount: number
}

export interface PropietarioRow {
  id: string
  nombre: string
  cedula: string | null
  telefono: string | null
  ciudad: string | null
  estado: string
  desde: string
  contratosActivos: number
  canonTotal: number
  moraActivaCount: number
}

export interface InquilinoRow {
  contratoId: string
  expedienteId: string
  inquilino: string
  cedula: string | null
  telefono: string | null
  inmueble: string
  municipio: string | null
  canon: number
  score: number | null
  resultado: string | null
  mes: number
  pago: 'mora' | 'al_dia'
  coarrendatario: string | null
  fechaFin: string | null
  email: string | null
  ocupacion: string | null
  actividadEconomica: string | null
  ingresos: number | null
  empresa: string | null
  tipoPersona: string | null
}

export interface ContratoAdminRow {
  id: string
  inmueble: string
  inquilino: string
  propietario: string
  canon: number
  inicio: string | null
  fin: string | null
  mes: number
  estado: string
  porVencer: boolean
  pago: 'mora' | 'al_dia'
  motivoCierre: string | null
}

export interface VitrinaPublicadoRow {
  id: string
  codigo: string | null
  inmueble: string
  tipo: string | null
  canon: number
  municipio: string | null
  publicado: string
  estado: string
  visitas: number
  contactos: number
}

export interface VitrinaProspectoRow {
  expedienteId: string
  nombre: string
  telefono: string | null
  inmueble: string
  fecha: string
  fuente: string
  estado: string
  notas: string | null
}

export interface VitrinaData {
  publicados: VitrinaPublicadoRow[]
  prospectos: VitrinaProspectoRow[]
}

export interface IngresoContratoRow {
  contratoId: string
  inquilino: string
  inmueble: string
  canon: number
  afianzamiento: number
  iva: number
  total: number
}

export interface IngresosData {
  valorAfianzamientoMensual: number
  ivaGarantiaPorcentaje: number
  totalAfianzamiento: number
  totalIva: number
  totalBruto: number
  porContrato: IngresoContratoRow[]
}

// ── Detalle de aliado (inmobiliaria/propietario) ────────────

export interface PerfilInmuebleRow {
  id: string
  codigo: string | null
  direccion: string | null
  ciudad: string | null
  estado: string | null
}

export interface PerfilContratoRow {
  id: string
  inmueble: string
  inquilino: string
  canon: number
  estado: string
  fechaInicio: string | null
  fechaFin: string | null
  mes: number
  pago: 'mora' | 'al_dia'
}

export interface PerfilDetalle {
  id: string
  rol: string
  nombre: string
  nit: string | null
  documento: string | null
  telefono: string | null
  ciudad: string | null
  direccion: string | null
  estado: string
  desde: string
  representante: string | null
  matriculaArrendador: string | null
  recaudo: {
    whatsapp: string | null
    email: string | null
    banco: string | null
    tipoCuenta: string | null
    numeroCuenta: string | null
    titularNombre: string | null
    titularNit: string | null
  }
  resumen: {
    inmuebles: number
    contratosActivos: number
    canonActivo: number
    moraActiva: number
  }
  inmuebles: PerfilInmuebleRow[]
  contratos: PerfilContratoRow[]
}

// ── Mis Inmuebles (propietario) ─────────────────────────────

export interface HistorialInquilino {
  inquilino: string
  desde: string | null
  hasta: string | null
  estado: string
}

export interface MiInmueble {
  id: string
  codigo: string | null
  direccion: string | null
  ciudad: string | null
  tipo: string | null
  canon: number
  habitaciones: number | null
  banos: number | null
  area: number | null
  estado: string
  visibleVitrina: boolean
  fotoFachadaUrl: string | null
  inquilino: string | null
  expedienteId: string | null
  contratoId: string | null
  venceContrato: string | null
  garantiaActiva: boolean
  pago: 'al_dia' | 'mora' | null
  historial: HistorialInquilino[]
  /** Estudios en curso (Flujo §4.2). Informativo: no bloquea nada. */
  estudiosActivos?: number
  /** Reservado: candidato aprobado con el contrato en proceso, aún sin firmar. */
  reservado?: boolean
}

export interface MisInmueblesData {
  resumen: { total: number; arrendados: number; disponibles: number; enVitrina: number; ingresoMes: number }
  inmuebles: MiInmueble[]
}

// ── Pagos a Cofianza (inmobiliaria) ─────────────────────────

export interface PagoCofianzaContratoRow {
  contratoId: string
  inquilino: string
  inmueble: string
  canon: number
  comision: number
  iva: number
  total: number
}

export interface MisPagosCofianzaData {
  comisionPorcentaje: number
  ivaPorcentaje: number
  detalle: PagoCofianzaContratoRow[]
  totales: { canon: number; comision: number; iva: number; total: number }
}

// ── Analítica de cartera (inmobiliaria) ─────────────────────

export interface MiCarteraAnalitica {
  salud: {
    contratosActivos: number
    morosidadPct: number
    moraActiva: number
    diasPromedioMora: number
    canonGestionado: number
  }
  estudios: {
    total: number
    aprobados: number
    scorePromedio: number | null
    decisiones30d: {
      aprobados: number
      condicionados: number
      rechazados: number
      total: number
      tasaAprobacion: number
    }
  }
}

// ── Service ─────────────────────────────────

class DashboardService {
  async getSummary(filters?: DashboardFilters): Promise<DashboardSummary> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)

    const query = params.toString()
    const url = `/dashboard/summary${query ? `?${query}` : ''}`
    const res = await apiClient.get<DashboardSummary>(url)
    return res.data
  }

  async getExpedientesPorEstado(filters?: DashboardFilters): Promise<ExpedientePorEstado[]> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)

    const query = params.toString()
    const url = `/dashboard/expedientes-por-estado${query ? `?${query}` : ''}`
    const res = await apiClient.get<ExpedientePorEstado[]>(url)
    return res.data
  }

  async getPortfolioStats(): Promise<PortfolioStats> {
    const res = await apiClient.get<PortfolioStats>('/dashboard/portfolio-stats')
    return res.data
  }

  async getAdminOverview(): Promise<AdminOverview> {
    const res = await apiClient.get<AdminOverview>('/dashboard/admin/overview')
    return res.data
  }

  async getTesoreria(): Promise<TesoreriaConfig> {
    const res = await apiClient.get<TesoreriaConfig>('/dashboard/admin/tesoreria')
    return res.data
  }

  async updateTesoreria(input: TesoreriaConfig): Promise<TesoreriaConfig> {
    const res = await apiClient.put<TesoreriaConfig>('/dashboard/admin/tesoreria', input)
    return res.data
  }

  async getInmobiliarias(): Promise<InmobiliariaRow[]> {
    const res = await apiClient.get<InmobiliariaRow[]>('/dashboard/admin/inmobiliarias')
    return res.data
  }

  async getPropietarios(): Promise<PropietarioRow[]> {
    const res = await apiClient.get<PropietarioRow[]>('/dashboard/admin/propietarios')
    return res.data
  }

  async getInquilinos(): Promise<InquilinoRow[]> {
    const res = await apiClient.get<InquilinoRow[]>('/dashboard/admin/inquilinos')
    return res.data
  }

  async getContratosAdmin(): Promise<ContratoAdminRow[]> {
    const res = await apiClient.get<ContratoAdminRow[]>('/dashboard/admin/contratos')
    return res.data
  }

  async getVitrinaAdmin(): Promise<VitrinaData> {
    const res = await apiClient.get<VitrinaData>('/dashboard/admin/vitrina')
    return res.data
  }

  async getIngresosAdmin(): Promise<IngresosData> {
    const res = await apiClient.get<IngresosData>('/dashboard/admin/ingresos')
    return res.data
  }

  async getPerfilDetalle(id: string): Promise<PerfilDetalle> {
    const res = await apiClient.get<PerfilDetalle>(`/dashboard/admin/perfiles/${id}/detalle`)
    return res.data
  }

  async getMisInmuebles(): Promise<MisInmueblesData> {
    const res = await apiClient.get<MisInmueblesData>('/dashboard/mis-inmuebles')
    return res.data
  }

  async getMisPagosCofianza(): Promise<MisPagosCofianzaData> {
    const res = await apiClient.get<MisPagosCofianzaData>('/dashboard/mis-pagos-cofianza')
    return res.data
  }

  async getMiCarteraAnalitica(): Promise<MiCarteraAnalitica> {
    const res = await apiClient.get<MiCarteraAnalitica>('/dashboard/mi-cartera-analitica')
    return res.data
  }
}

export const dashboardService = new DashboardService()
