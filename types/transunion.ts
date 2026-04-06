// ============================================
// TransUnion Colombia — Response Types
// Combo CreditVision + Info Comercial (1901)
// ============================================

export interface TransUnionTercero {
  NombreTitular?: string
  TipoIdentificacion?: string
  NumeroIdentificacion?: string
  Estado?: string
  RangoEdad?: string
  LugarExpedicion?: string
  FechaExpedicion?: string
  CodigoDepartamento?: string
  CodigoMunicipio?: string
}

export interface TransUnionVariable {
  id?: number
  nombre: string
  valor: string
}

export interface TransUnionFechaCorte {
  variables: TransUnionVariable[]
  valor?: string
}

export interface TransUnionCreditVision {
  fechaCorte?: TransUnionFechaCorte[]
  policyId?: string
  resultadoOperacion?: string
  transactionId?: string
  codigoDepartamento?: string
  codigoMunicipio?: string
}

export interface TransUnionObligacion {
  NombreEntidad?: string
  Ciudad?: string
  NumeroObligacion?: string
  TipoObligacion?: string
  EstadoObligacion?: string
  FechaApertura?: string
  FechaUltimoPago?: string
  SaldoObligacion?: string
  ValorMora?: string
  CuotaMensual?: string
  Comportamiento?: string
}

export interface TransUnionConsolidadoRegistro {
  PaqueteInformacion?: string
  NumeroObligaciones?: string
  TotalSaldo?: string
  NumeroObligacionesDia?: string
  SaldoObligacionesDia?: string
  CantidadObligacionesMora?: string
  SaldoObligacionesMora?: string
  ValorMora?: string
}

export interface TransUnionConsolidado {
  ResumenPrincipal?: {
    Registro?: TransUnionConsolidadoRegistro[]
  }
  Registro?: TransUnionConsolidadoRegistro
}

export interface TransUnionHuellaConsulta {
  FechaConsulta?: string
  NombreEntidad?: string
  Ciudad?: string
  TipoConsulta?: string
  MotivoConsulta?: string
}

export interface TransUnionInfoComercial {
  Consolidado?: TransUnionConsolidado
  SectorFinancieroAlDia?: { Obligacion?: TransUnionObligacion[] }
  SectorFinancieroEnMora?: { Obligacion?: TransUnionObligacion[] }
  SectorRealAlDia?: { Obligacion?: TransUnionObligacion[] }
  SectorRealExtinguidas?: { Obligacion?: TransUnionObligacion[] }
  HuellaConsulta?: { Consulta?: TransUnionHuellaConsulta[] }
}

export interface TransUnionResponse {
  Tercero?: TransUnionTercero
  CreditVision_5694?: TransUnionCreditVision
  Informacion_Comercial_154?: TransUnionInfoComercial
}
