/**
 * Documentos legales que la inmobiliaria/propietario sube para operar
 * con Cofianza (Camara de Comercio, RUT, Matricula, Cedula RL, Poder,
 * Poliza, Contrato Marco). Mario 12-may-2026.
 */

import { apiClient } from '@/lib/api'

export const TIPOS_DOCUMENTO_LEGAL = [
  'camara_comercio',
  'rut',
  'matricula_arrendador',
  'cedula_representante',
  'poder_notarial',
  'poliza',
  'contrato_marco',
] as const

export type TipoDocumentoLegal = (typeof TIPOS_DOCUMENTO_LEGAL)[number]

export interface IDocumentoLegal {
  id: string
  perfil_id: string
  tipo: TipoDocumentoLegal
  storage_key: string
  nombre_archivo: string
  tipo_mime: string
  tamano_bytes: number
  estado: 'cargado' | 'validado' | 'rechazado'
  notas_validacion: string | null
  subido_por: string | null
  subido_en: string
  validado_por: string | null
  validado_en: string | null
  created_at: string
  updated_at: string
}

export interface IDocumentoLegalResumen {
  tipo: TipoDocumentoLegal
  cargado: boolean
  documento: IDocumentoLegal | null
}

class DocumentosLegalesService {
  private basePath = '/documentos-legales'

  async listMine(): Promise<IDocumentoLegalResumen[]> {
    const res = await apiClient.get<IDocumentoLegalResumen[]>(this.basePath)
    return res.data
  }

  async upload(tipo: TipoDocumentoLegal, file: File): Promise<IDocumentoLegal> {
    const form = new FormData()
    form.append('archivo', file)
    const res = await apiClient.post<IDocumentoLegal>(`${this.basePath}/${tipo}`, form)
    return res.data
  }

  async getDownloadUrl(tipo: TipoDocumentoLegal): Promise<{ url: string; nombre_archivo: string }> {
    const res = await apiClient.get<{ url: string; nombre_archivo: string }>(
      `${this.basePath}/${tipo}/download`,
    )
    return res.data
  }

  async remove(tipo: TipoDocumentoLegal): Promise<void> {
    await apiClient.delete(`${this.basePath}/${tipo}`)
  }
}

export const documentosLegalesService = new DocumentosLegalesService()
