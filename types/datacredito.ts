// ============================================
// DataCredito Experian (Colombia) — Response Types
// Historia de Credito Plus (HDC Plus) REST v1
// ============================================
//
// La raiz persistida en `estudios.respuesta_proveedor` conserva el wrapper
// del proveedor: { ReportHDCplus: { ...13 secciones... } }. A diferencia de
// TransUnion, que se guarda sin envoltura.
//
// Convenciones del payload que estos tipos reflejan tal cual:
//  - Claves en camelCase ingles, con 10 excepciones capitalizadas por el
//    propio servicio (`HightestDebtBalance` — con typo —, `FeaturesCreditCard`,
//    `Guarantee`). Se respetan literalmente.
//  - Muchos campos llegan indistintamente como entero o como string
//    (`accountType` 46 vs '05'), de ahi `DcNumeroLaxo`.
//  - Centinelas: -1 = "la fuente no reporto", '-' = "no existe informacion",
//    null = campo no diligenciado. Nunca son ceros ni valores reales.
//  - Unidades mezcladas: el detalle (`liabilities`, `creditCard`,
//    `globalIndebtedness`) viene en PESOS; los consolidados de
//    `agregatedInfo.overview.balances` vienen en MILES de pesos.
//
// Solo se tipa lo que consume DataCreditoReportDetail. Todo es opcional
// porque el payload de codigo 14 (consulta efectiva sin informacion) trae
// apenas 7 de las 13 secciones.

/**
 * Numerico laxo: el servicio emite el mismo campo como entero o como string
 * segun el registro. Normalizar con Number()/String().trim() antes de comparar.
 */
export type DcNumeroLaxo = number | string

export interface DcPersonId {
  personIdNumber?: DcNumeroLaxo | null
  personIdType?: DcNumeroLaxo | null
  personIdDesc?: string | null
}

// ── Cabecera de la consulta ─────────────────────────────────

export interface DcProductResult {
  /** Codigo de seguridad de la consulta (trazabilidad ante Experian). */
  securityCode?: string | null
  /** Fecha del pull, NO la fecha de corte de los datos. */
  consultDate?: string | null
  /** Tabla 13. 13 = efectiva con informacion, 14 = efectiva sin informacion. */
  responseCode?: DcNumeroLaxo | null
  responseDesc?: string | null
}

export interface DcIdentifyingAttributes {
  personId?: DcPersonId
  personLastName?: string | null
}

// ── Identidad del titular ───────────────────────────────────

export interface DcIdentificacion {
  /** Tabla 2. '00' vigente, '21' cancelada por muerte, '88'/'99' en tramite. */
  statusId?: string | null
  /** Solo viene en `location.nationalNatural`, no en `basicInformation`. */
  statusDesc?: string | null
  issueDate?: string | null
  issuingCityName?: string | null
  issuingStateName?: string | null
  personId?: DcPersonId
}

export interface DcEdad {
  min?: number | null
  minDesc?: string | null
  max?: number | null
  maxDesc?: string | null
}

export interface DcBasicInformation {
  personId?: DcPersonId
  // `gender` / `genderDesc` (Tabla 19) llegan en el payload pero NO se tipan a
  // proposito: es un atributo protegido sin relevancia crediticia y la tabla
  // mezcla estado civil con genero (1 Casada, 2 Viuda, 3 Mujer, 4 Hombre). No
  // debe mostrarse en la pantalla de decision del expediente.
  names?: string | null
  firstLastName?: string | null
  secondLastName?: string | null
  /** Viene con los apellidos primero. */
  fullName?: string | null
  /** La cedula tiene historia como NIT (persona con actividad comercial). */
  citizenTaxRegistrationIndicator?: boolean | null
  /** Validada contra Registraduria. */
  officialSourceValidationStatus?: boolean | null
  identification?: DcIdentificacion
  age?: DcEdad
}

export interface DcLocation {
  /** Copia casi literal de `basicInformation`; aporta `statusDesc` y `age.minDesc`. */
  nationalNatural?: {
    identification?: DcIdentificacion
    age?: DcEdad
  }
}

// ── Cuentas: tronco comun de cartera y tarjetas ─────────────

export interface DcAccount {
  primaryKey?: string | null
  /** Tabla 14 (cartera) o Tabla 33 (ahorros). '-' = no reporta. */
  rating?: DcNumeroLaxo | null
  ratingDesc?: string | null
  filingCityName?: string | null
  /** Nombre de la entidad en `liabilities` y `savings`. Viene con padding. */
  businessLineName?: string | null
  /** En `creditCard` el NOMBRE de la entidad viaja aqui, no en businessLineName. */
  businessLineCode?: string | null
  accountOpeningDate?: string | null
  accountNumber?: DcNumeroLaxo | null
  filingOffice?: DcNumeroLaxo | null
  /** Tabla 46: 1 financiero, 2 cooperativo, 3 real, 4 telecomunicaciones. */
  economicSector?: DcNumeroLaxo | null
  economicSectorName?: string | null
  /** Tabla 28: 0 normal, 5 insolvencia Ley 2455, 8 liquidacion patrimonial. */
  stateOfAccountHolder?: DcNumeroLaxo | null
  stateOfAccountHolderDesc?: string | null
  /** Suscriptor que reporta (NIT), no el titular. */
  personId?: DcPersonId
  accountType?: DcNumeroLaxo | null
  /** Poco fiable: contradice la Tabla 3 en algunos registros. Preferir subAccountType*. */
  accountTypeDesc?: string | null
  subAccountType?: DcNumeroLaxo | null
  subAccountTypeDesc?: string | null
  subAccountTypeName?: string | null
}

export interface DcCreditAccount {
  expiryDate?: string | null
  /** Tabla 17: 2 proceso ejecutivo, 3 mandamiento de pago, 8 insoluta, 9 prescrita. */
  paymentType?: DcNumeroLaxo | null
  paymentTypeDesc?: string | null
  /** Vector de comportamiento mensual, 47 posiciones, la mas reciente a la izquierda. */
  businessBehaviourVectorProduct?: string | null
}

export interface DcAccountStatus {
  account?: {
    /** Tabla 41: '01' al dia, '02' en mora, '05' dudoso recaudo, '06' castigada. */
    businessAccountStatus?: DcNumeroLaxo | null
    businessAccountStatusDesc?: string | null
    accountStatusDate?: string | null
  }
  origin?: {
    /** Tabla 42: 0 normal, 1 reestructurada, 2 refinanciada. */
    originStatusOfAccount?: DcNumeroLaxo | null
    originStatusOfAccountDesc?: string | null
    dateOfOriginStatus?: string | null
  }
  payment?: {
    /**
     * Tabla 4, columna "Estado" (Vigente / Cerrada):
     *  '01' al dia (Vigente) · '02'-'08' cerrada sin mora historica
     *  '09'-'12' pago total con mora maxima de 30/60/90/120 (CERRADA)
     *  '13'-'16' al dia con mora maxima historica (Vigente)
     *  '17'-'41' mora activa (Vigente) · '45' castigada · '47' dudoso recaudo
     *  '49' tarjeta renovada (CERRADA) · '60' en reclamacion (Vigente)
     */
    businessBureauEvent?: DcNumeroLaxo | null
    businessBureauEventDesc?: string | null
    paymentDate?: string | null
    paymentMonths?: number | null
  }
  /** Solo en tarjetas. Tabla 40: 1 entregado, 8 devuelto. */
  card?: {
    cardStatusCode?: DcNumeroLaxo | null
    cardStatusName?: string | null
    dateOfCreditStatus?: string | null
  }
}

/** Importes de la cuenta, en PESOS. Ausente en las obligaciones ya canceladas. */
export interface DcAccountValues {
  rating?: DcNumeroLaxo | null
  ratingDesc?: string | null
  behaviourDate?: string | null
  currencyType?: DcNumeroLaxo | null
  currencyTypeDesc?: string | null
  valueMonthlyPayment?: DcNumeroLaxo | null
  paidInstallments?: number | null
  installmentsOverdue?: number | null
  /** Dias de mora. */
  delinquencyMaturation?: number | null
  /** -1 = la fuente no reporto. */
  availableBalance?: number | null
  paymentDeadline?: string | null
  paymentDate?: string | null
  periodicityOfPayments?: DcNumeroLaxo | null
  periodicityOfPaymentsDesc?: string | null
  /** Saldo en mora. */
  businessValueBalanceOverdue?: number | null
  debtBalance?: number | null
  /** Valor inicial o cupo. */
  initialValue?: number | null
  totalNumberOfInstallments?: number | null
}

export interface DcFeaturesLiabilities {
  /** Tabla 9: 1 comercial, 2 consumo, 3 hipotecario, 5 microcredito, 6 libranza. */
  typeOfCredit?: DcNumeroLaxo | null
  typeOfCreditDesc?: string | null
  contractType?: DcNumeroLaxo | null
  contractTypeDesc?: string | null
  /** Tabla 11. Ojo: `guaranteeTypeName` llega como 0 en algunos registros. */
  guaranteeType?: DcNumeroLaxo | null
  guaranteeTypeName?: DcNumeroLaxo | null
  /** Tabla 6: '00' principal, '01'-'03' codeudor, '06' coarrendatario, '08' fiador. */
  typeOfDebtor?: DcNumeroLaxo | null
  typeOfDebtorDesc?: string | null
}

export interface DcFeaturesCreditCard extends DcFeaturesLiabilities {
  debtor?: boolean | null
  /** Tabla 38: 1 clasica, 2 gold, 3 platinum, 4 otra, 5 black. */
  cardClass?: DcNumeroLaxo | null
  /** null en todos los registros observados. */
  cardClassName?: string | null
  /** Tabla 37: 1 american express, 2 visa, 3 master card, 4 diners, 5 privada. */
  franchiseType?: DcNumeroLaxo | null
  franchiseName?: string | null
}

export interface DcLiability {
  account?: DcAccount
  liabilitiesAccount?: DcCreditAccount
  featuresLiabilities?: DcFeaturesLiabilities
  status?: DcAccountStatus
  values?: DcAccountValues[]
}

export interface DcCreditCard {
  account?: DcAccount
  creditCardAccount?: DcCreditAccount
  /** F mayuscula: asi lo emite el servicio. */
  FeaturesCreditCard?: DcFeaturesCreditCard
  status?: DcAccountStatus
  values?: DcAccountValues[]
}

export interface DcSaving {
  account?: DcAccount
  features?: {
    accountCategory?: DcNumeroLaxo | null
    accountCategoryDesc?: string | null
  }
  status?: {
    businessBureauEvent?: DcNumeroLaxo | null
    businessBureauEventDesc?: string | null
  }
  values?: DcAccountValues[]
}

// ── Endeudamiento global (Superintendencia + Datacredito) ───

export interface DcGlobalIndebtedness {
  primaryKey?: string | null
  /** Tabla 44: 'S' Superintendencia, 'DC' Datacredito. */
  sourceGlobalIndebtedness?: string | null
  sourceGlobalIndebtednessDesc?: string | null
  /** Tabla 15. '-' = no reporta informacion. */
  quarterQualification?: string | null
  quarterQualificationDesc?: string | null
  cutoffDate?: string | null
  tradeHolderIndicator?: boolean | null
  /** Tabla 12: 'ML' moneda legal, 'ME' extranjera ('MC' observado, no documentado). */
  currencyType?: string | null
  currencyTypeDesc?: string | null
  quantityOfObligations?: number | null
  /** En PESOS, a diferencia del resto de consolidados. */
  capitalValue?: number | null
  /** Tabla 43: 'CMR', 'HIP', 'MIC', 'CNS'. */
  typeOfCredit?: string | null
  typeOfCreditDesc?: string | null
  entity?: {
    businessLineName?: string | null
    counterpartyIdNumber?: DcNumeroLaxo | null
    economicSector?: DcNumeroLaxo | null
    economicSectorName?: string | null
  }
  /** G mayuscula. Tabla 47, distinta de la Tabla 11 del detalle. */
  Guarantee?: {
    guaranteeType?: DcNumeroLaxo | null
    guaranteeTypeName?: DcNumeroLaxo | null
    guaranteeValue?: number | null
  }
}

// ── Huellas de consulta ─────────────────────────────────────

export interface DcInquiryFootprint {
  primaryKey?: string | null
  quantity?: DcNumeroLaxo | null
  economicSector?: DcNumeroLaxo | null
  economicSectorName?: string | null
  /** Sigla de la Tabla 3. `accountTypeDesc` llega null. */
  accountTypeName?: string | null
  accountTypeDesc?: string | null
  /** Relleno de guiones cuando no hay dato. */
  filingOffice?: string | null
  filingCityName?: string | null
  inquiryBusinessName?: string | null
  counterpartyIdNumber?: DcNumeroLaxo | null
  inquiryDate?: string | null
  /** Tabla 21: '01' solicitud de producto, '00' razon desconocida. */
  inquiryReasonCode?: string | null
  inquiryReasonDesc?: string | null
}

// ── Score y modelos ─────────────────────────────────────────

export interface DcModel {
  /** Codigos de exclusion. '00099' = cliente CON estimacion, no exclusion. */
  ScoreReason?: (string | null)[]
  /** Tabla 18. 'DF' = Advance 1.1. */
  modelCode?: string | null
  modelCodeDesc?: string | null
  modelName?: (string | null)[]
  modelDate?: string | null
  /** 0 significa AUSENCIA de score, no score cero. */
  scoreValue?: number | null
  population?: number | null
}

// ── Advance Income (estimacion de ingreso) ──────────────────

export interface DcProductValue {
  /** 'DW' = Advance Income. */
  productCode?: string | null
  productName?: string | null
  /** Solo significativo en el primer elemento. 50-54 = exclusion, 99 = hay estimacion. */
  reason?: string | null
  /** En MILES de pesos. */
  value?: number | null
  valueSMLV?: number | null
}

// ── Consolidados (MILES de pesos, salvo `balances.month`) ───

export interface DcBalanceSector {
  /** Porcentaje 0-100. */
  shareSector?: number | null
  /** MILES de pesos. */
  debtBalance?: number | null
  /** Tabla 46, numerico y sin nombre en esta seccion. */
  economicSector?: DcNumeroLaxo | null
}

export interface DcBalanceMonth {
  behaviourDate?: string | null
  /** Excepcion: esta serie mensual viene en PESOS. */
  totalBalance?: number | null
  totalValueBalanceOverdue?: number | null
}

export interface DcBehaviourMonth {
  behaviourDate?: string | null
  /** Tabla 5: 'N' al dia, '1'-'6' mora 30-180, '-' sin informacion, 'C'/'D' castigada. */
  behaviour?: string | null
  numberOfAccounts?: number | null
}

export interface DcAgregatedBalances {
  /** MILES de pesos. */
  valueMonthlyPayment?: number | null
  /** MILES. Typo del servicio (Hightest); el diccionario PATH usa minuscula. */
  HightestDebtBalance?: number | null
  hightestDebtBalance?: number | null
  /** MILES. Saldo con mora de 30 / 60 / 90 dias. */
  debtBalanceD30?: number | null
  debtBalanceD60?: number | null
  debtBalanceD90?: number | null
  /** MILES. */
  totaldebtBalance?: number | null
  totalValueBalanceOverdue?: number | null
  sector?: DcBalanceSector[]
  month?: DcBalanceMonth[]
}

export interface DcAgregatedPrincipals {
  /** Antiguedad crediticia: apertura mas antigua. */
  maturationSince?: string | null
  consultedLast6Months?: number | null
  closedCredits?: number | null
  currentNegativeCredits?: number | null
  currentCredits?: number | null
  /** Cuentas de ahorro y corrientes abiertas / cerradas. */
  openedAccountsAHOCCB?: number | null
  closedAccountsAHOCCB?: number | null
  totalDisputes?: number | null
  negativeHistoricalLast12Months?: number | null
  currentDisputes?: number | null
}

export interface DcAgregatedOverview {
  principals?: DcAgregatedPrincipals
  /** Grafia alterna del manual; el servicio emite `principals`. */
  PrincipalsAgregatedInfo?: DcAgregatedPrincipals
  balances?: DcAgregatedBalances
  /** Grafia alterna del manual; el servicio emite `balances`. */
  BalancesAgregatedInfo?: DcAgregatedBalances
  behavior?: {
    month?: DcBehaviourMonth[]
  }
}

export interface DcAgregatedInfo {
  overview?: DcAgregatedOverview
}

// ── Reporte y envoltura ─────────────────────────────────────

export interface DcReport {
  productResult?: DcProductResult
  identifyingAttributes?: DcIdentifyingAttributes
  basicInformation?: DcBasicInformation
  location?: DcLocation
  savings?: DcSaving[]
  liabilities?: DcLiability[]
  creditCard?: DcCreditCard[]
  globalIndebtedness?: DcGlobalIndebtedness[]
  inquiryFootprints?: DcInquiryFootprint[]
  models?: DcModel[]
  /** Arreglo ANIDADO: [[{ productCode: 'DW', ... }]]. Requiere .flat(). */
  productValueList?: DcProductValue[][]
  /** El servicio emite la clave a minuscula; el manual la documenta capitalizada. */
  agregatedInfo?: DcAgregatedInfo
  AgregatedInfo?: DcAgregatedInfo
}

export interface DataCreditoResponse {
  ReportHDCplus?: DcReport
}
