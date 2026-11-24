/**
 * Integración nuby (solo lectura): conectar, probar, sincronizar y resolver
 * pendientes. El titular de la inmobiliaria y el administrador de plataforma
 * usan los mismos endpoints sobre bases distintas; la API valida quién puede.
 */

import { apiClient } from '@/lib/api'
import { baseIntegracionNuby, normalizarEstadoNuby } from '@/lib/integracionNuby'
import type {
  CredencialesNuby,
  EstadoIntegracionNuby,
  ModoIntegracionNuby,
  PruebaConexionNuby,
  VinculoNuby,
} from '@/types/integracionNuby'

class IntegracionNubyService {
  async obtener(modo: ModoIntegracionNuby): Promise<EstadoIntegracionNuby> {
    const r = await apiClient.get<EstadoIntegracionNuby>(baseIntegracionNuby(modo))
    return normalizarEstadoNuby(r.data)
  }

  /** Conecta o reemplaza las credenciales. La API prueba la conexión antes de guardar. */
  async conectar(modo: ModoIntegracionNuby, credenciales: CredencialesNuby): Promise<EstadoIntegracionNuby> {
    const r = await apiClient.put<EstadoIntegracionNuby>(baseIntegracionNuby(modo), credenciales)
    return normalizarEstadoNuby(r.data)
  }

  /** Prueba las credenciales ya guardadas. */
  async probar(modo: ModoIntegracionNuby): Promise<PruebaConexionNuby> {
    const r = await apiClient.post<PruebaConexionNuby>(`${baseIntegracionNuby(modo)}/probar`, {})
    return r.data
  }

  /** Lanza una copia en segundo plano (202): el avance se sigue con `obtener`. */
  async sincronizar(modo: ModoIntegracionNuby): Promise<{ iniciada: true }> {
    const r = await apiClient.post<{ iniciada: true }>(`${baseIntegracionNuby(modo)}/sincronizar`, {})
    return r.data
  }

  /** Los inmuebles se quedan en Cofianza y pasan a editarse ahí. */
  async desconectar(modo: ModoIntegracionNuby): Promise<{ desconectada: true }> {
    const r = await apiClient.delete<{ desconectada: true }>(baseIntegracionNuby(modo))
    return r.data
  }

  /** Resuelve un código repetido: cuál inmueble de Cofianza es el de nuby. */
  async vincular(modo: ModoIntegracionNuby, vinculo: VinculoNuby): Promise<EstadoIntegracionNuby> {
    const r = await apiClient.post<EstadoIntegracionNuby>(`${baseIntegracionNuby(modo)}/vinculos`, vinculo)
    return normalizarEstadoNuby(r.data)
  }
}

export const integracionNubyService = new IntegracionNubyService()
