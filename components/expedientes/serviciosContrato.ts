/**
 * Lista canónica (en el front) de los servicios públicos/obligaciones cuyo
 * pago se reparte entre arrendatario y arrendador en el contrato V4.
 *
 * Espejo de SERVICIOS_PUBLICOS del backend (contratos.service.ts): si se
 * agrega/renombra un servicio allá, actualizar AQUÍ (única copia del front —
 * la consumen GenerarContratoModal y RegenerarContratoModal).
 */
export const SERVICIOS_CONTRATO: { key: string; label: string }[] = [
  { key: 'agua', label: 'Agua y alcantarillado' },
  { key: 'energia', label: 'Energía eléctrica' },
  { key: 'gas', label: 'Gas natural' },
  { key: 'basuras', label: 'Recolección de basuras' },
  { key: 'alumbrado', label: 'Alumbrado público' },
  { key: 'internet', label: 'Internet / TV / Telefonía' },
  { key: 'admin_ph', label: 'Administración PH' },
]
