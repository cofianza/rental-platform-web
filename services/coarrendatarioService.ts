/**
 * Servicio de Coarrendatarios — flujo nuevo para estudios condicionados
 * (Gerencia, 5-may-2026). Reemplaza la subida de documentos: el solicitante
 * invita a un coarrendatario que acepta T&C y se le hace su propio estudio.
 */

import type { IBeneficioPrima } from '@/lib/textosPrima'
import { apiClient } from '@/lib/api'

export type CoarrendatarioEstado =
  | 'pendiente_aceptacion'
  | 'aceptado'
  | 'rechazado_invitacion'
  | 'estudio_completado'
  /** Salió del estudio (cambio de persona). Su enlace público ya no sirve: la API responde 410. */
  | 'retirado'

export interface ICoarrendatarioEstudio {
  id: string
  estado: string
  resultado: string | null
  score: number | null
  observaciones: string | null
  fecha_completado: string | null
}

export interface ICoarrendatario {
  id: string
  expediente_id: string
  nombre: string
  apellido: string
  tipo_documento: string
  numero_documento: string
  email: string
  telefono: string | null
  estado: CoarrendatarioEstado
  estudio_id: string | null
  /** Vence el enlace de la invitación; reenviarla lo renueva. */
  token_expiracion: string
  aceptado_at: string | null
  rechazado_at: string | null
  created_at: string
  updated_at: string
  /**
   * Solo al titular, si lo invitó quien tramita el arriendo: llegan el nombre y
   * el documento enmascarado, sin correo ni teléfono (email '', telefono null).
   */
  datos_protegidos?: boolean
  /** Solo en la respuesta de reenviar: true si se emitió un enlace nuevo (cambió la persona o el destino). */
  enlace_renovado?: boolean
  /** Estudio TransUnion del coarrendatario (embebido por el backend). */
  estudio?: ICoarrendatarioEstudio | null
}

/**
 * Si se puede invitar coarrendatario ahora (Decisiones 2 y 4, 2026-09-25): con
 * el estudio en revisión o aprobado antes del contrato, en el canal de
 * inmobiliaria y sin otra invitación viva. `vigente`: la invitación ya enviada
 * sigue en pie.
 */
export interface IVentanaCoarrendatario {
  vigente: boolean
  puede_invitar: boolean
  motivo: string | null
  /** Por qué no se puede invitar (p. ej. COARRENDATARIO_CANAL_PROPIETARIO); null si se puede. Ausente en un API anterior. */
  codigo?: string | null
  /**
   * El contrato de propietarios (flujo anterior) rechazaría este estudio: coarrendatario vinculado, o el
   * titular de la decisión no es el solicitante. null = se puede generar; ausente = un API anterior.
   */
  contrato_anterior_bloqueado?: { codigo: string; motivo: string } | null
  /** Lo que las tarjetas dicen de la prima con coarrendatario: el texto lo manda la API; null = no hay beneficio (ausente en un API anterior). */
  beneficio_prima?: IBeneficioPrima | null
  /** Si cargar a la persona es directo o pasa por un cambio de persona (lo dice la API; ausente en un API anterior). */
  es_primer_segundo_firmante?: boolean
  cobra_consulta_adicional?: boolean
}

export interface IInvitarCoarrendatarioInput {
  nombre: string
  apellido: string
  tipo_documento: 'cc' | 'ce' | 'ppt' | 'pep' | 'ti' | 'pasaporte' | 'nit'
  numero_documento: string
  email: string
  telefono?: string
}

export interface ICoarrendatarioPublicView {
  nombre: string
  apellido: string
  /** Enmascarado («CC ••••5678»): el invitado reconoce si es el suyo. */
  documento: string
  /** Ausente cuando la API pide comprobar el documento antes (contacto_resultado.documento_requerido). */
  email?: string
  estado: CoarrendatarioEstado
  expediente: {
    numero: string
    inmueble_direccion: string
    inmueble_ciudad: string
    titular_nombre: string
  }
  expira_en: string
  /** Adenda 3 V2 §9: ofrecer «No soy esa persona» (solo con las reglas nuevas encendidas). */
  permite_no_soy_yo?: boolean
  /** Pide el correo donde quiere recibir el resultado de su evaluación. Ausente = no se pide. */
  contacto_resultado?: {
    requerido: true
    /** Pide escribir el número de documento antes de mostrar el correo y de aceptar. */
    documento_requerido?: true
  }
  /**
   * Texto integro de la autorizacion de tratamiento de datos que el invitado
   * acepta, con su version. Flujo del modulo de estudios §8.4: debe estar
   * visible en la pantalla, no oculto tras un enlace. Es exactamente el texto
   * que el backend congela en autorizaciones_habeas_data.texto_autorizado.
   */
  texto_legal: string
  version_terminos: string
}

export const coarrendatarioService = {
  /** Solicitante / propietario invita a un coarrendatario. */
  /** `sustitucionId`: el cambio de persona ya habilitado con el que entra (si aplica). */
  async invitar(expedienteId: string, input: IInvitarCoarrendatarioInput, sustitucionId?: string): Promise<ICoarrendatario> {
    const cuerpo = sustitucionId ? { ...input, sustitucion_id: sustitucionId } : input
    const res = (await apiClient.post(`/expedientes/${expedienteId}/coarrendatario`, cuerpo)) as unknown as {
      data: ICoarrendatario
    }
    return res.data
  },

  /**
   * Reenvía la invitación pendiente, corrigiendo lo que venía mal (contacto,
   * nombre o documento). El backend regenera el token (invalida el enlace
   * anterior) y reenvía el correo.
   */
  async reenviar(
    expedienteId: string,
    input: Partial<IInvitarCoarrendatarioInput> = {},
  ): Promise<ICoarrendatario> {
    const res = (await apiClient.post(
      `/expedientes/${expedienteId}/coarrendatario/reenviar`,
      input,
    )) as unknown as { data: ICoarrendatario }
    return res.data
  },

  /** Cancela la invitación antes de que la acepte: libera el cupo para invitar a otra persona. */
  async cancelar(expedienteId: string): Promise<{ ok: true }> {
    const res = (await apiClient.post(`/expedientes/${expedienteId}/coarrendatario/cancelar`, {})) as unknown as {
      data: { ok: true }
    }
    return res.data
  },

  /** Estado del coarrendatario actual del expediente (o null si no hay). */
  async getDelExpediente(expedienteId: string): Promise<ICoarrendatario | null> {
    const res = (await apiClient.get(`/expedientes/${expedienteId}/coarrendatario`)) as unknown as {
      data: ICoarrendatario | null
    }
    return res.data
  },

  /** Si se puede invitar ahora y si la invitación enviada sigue en pie. */
  async getVentana(expedienteId: string): Promise<IVentanaCoarrendatario> {
    const res = (await apiClient.get(`/expedientes/${expedienteId}/coarrendatario/ventana`)) as unknown as {
      data: IVentanaCoarrendatario
    }
    return res.data
  },

  /** Vista pública: el invitado abre el link y vemos info de la invitación. */
  async getPublicByToken(token: string): Promise<ICoarrendatarioPublicView> {
    const res = (await apiClient.get(`/public/coarrendatario/${token}`)) as unknown as {
      data: ICoarrendatarioPublicView
    }
    return res.data
  },

  /** Invitado acepta T&C — el backend dispara su estudio TransUnion. */
  /** `notificacion`: su dirección y municipio para el contrato (Contratos V3 §8.7.2). */
  async aceptar(
    token: string,
    notificacion?: { direccion: string; municipio: string },
    /** Solo si la pantalla lo pide (contacto_resultado): el correo para el resultado de su evaluación y su documento. */
    contacto?: { correo_resultado?: string; numero_documento?: string },
  ): Promise<{ ok: true; estudio_id: string | null; mensaje: string }> {
    const res = (await apiClient.post(`/public/coarrendatario/${token}/aceptar`, {
      acepta_terminos: true,
      acepta_datos: true,
      ...notificacion,
      ...contacto,
    })) as unknown as { data: { ok: true; estudio_id: string | null; mensaje: string } }
    return res.data
  },

  /** Comprueba el número de documento que escribió el invitado; si coincide, devuelve el correo para prellenar. */
  async confirmarDocumento(token: string, numeroDocumento: string): Promise<{ coincide: true; correo_resultado: string | null }> {
    const res = (await apiClient.post(`/public/coarrendatario/${token}/confirmar-documento`, {
      numero_documento: numeroDocumento,
    })) as unknown as { data: { coincide: true; correo_resultado: string | null } }
    return res.data
  },

  /** «Mi documento está mal»: avisa a quien puede corregirlo; la invitación sigue abierta. */
  async reportarDocumentoIncorrecto(token: string): Promise<{ ok: true }> {
    const res = (await apiClient.post(`/public/coarrendatario/${token}/documento-incorrecto`, {})) as unknown as {
      data: { ok: true }
    }
    return res.data
  },

  /** Adenda 3 V2 §9: «No soy esa persona». Cierra esta invitación; el estudio del titular sigue. */
  async reportarNoSoyEsaPersona(token: string): Promise<{ ok: true }> {
    const res = (await apiClient.post(`/public/coarrendatario/${token}/no-soy-yo`, {})) as unknown as {
      data: { ok: true }
    }
    return res.data
  },

  /** Invitado declina la invitación. */
  async rechazar(token: string): Promise<{ ok: true }> {
    const res = (await apiClient.post(`/public/coarrendatario/${token}/rechazar`, {})) as unknown as {
      data: { ok: true }
    }
    return res.data
  },
}
