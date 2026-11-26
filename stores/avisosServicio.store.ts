/**
 * Avisos de servicio vigentes para la sesión (el banner de los tres shells).
 * En un store para que la pantalla del administrador lo refresque al guardar
 * y el banner cambie en el acto.
 *
 * Reporte de la Oficina Virtual (25-nov), punto 12: en el panel, cerrar un aviso
 * se guarda en la CUENTA (POST /avisos-servicio/:id/cerrar; la API ya no manda
 * los que la persona cerró, hasta que el administrador los edite). Se oculta en
 * el acto; si la API no lo pudo guardar, se recuerda en este navegador para esa
 * persona (respaldo), salvo los casos de siNoSeGuardoElCierre. Los cierres de
 * antes (la clave del navegador sin persona) no se traen: un aviso cerrado
 * antes de este cambio sale una vez más y, al cerrarlo, queda en la cuenta. Las páginas públicas (prospectos sin cuenta) siguen
 * recordándolo solo en el navegador, por versión (id + actualizado_en).
 */

import { create } from 'zustand'
import { ApiClientError } from '@/lib/api'
import { cerrarAviso, getAvisosActivos } from '@/services/avisosServicioService'
import { CLAVE_OCULTOS_PUBLICOS, claveOcultosDe, podarOcultos, siNoSeGuardoElCierre, type AvisosOcultos } from '@/lib/avisosServicio'
import type { IAvisoVisible } from '@/types/avisosServicio'

function leerOcultos(clave: string): AvisosOcultos {
  try {
    const v = JSON.parse(localStorage.getItem(clave) ?? '{}') as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as AvisosOcultos) : {}
  } catch {
    return {}
  }
}

function guardarOcultos(clave: string, ocultos: AvisosOcultos) {
  try {
    if (Object.keys(ocultos).length === 0) localStorage.removeItem(clave)
    else localStorage.setItem(clave, JSON.stringify(ocultos))
  } catch {}
}

interface AvisosServicioState {
  activos: IAvisoVisible[]
  /** Rol con el que se pidieron: al cambiar de cuenta en la misma pestaña no se muestran los de la anterior. */
  rol: string | null
  /** La persona con la que se pidieron (los cierres son suyos). */
  usuario: string | null
  /** Panel: los recién cerrados y los que la API no pudo guardar (respaldo de este navegador). */
  ocultos: AvisosOcultos
  /** Páginas públicas: los ocultados en este navegador. */
  ocultosPublicos: AvisosOcultos
  cargar: (rol: string, usuario: string) => Promise<void>
  /** Panel: cierra el aviso en la cuenta de la persona. */
  ocultar: (aviso: IAvisoVisible) => void
  /** Páginas públicas: trae lo ocultado en este navegador sin pedir los avisos del panel. */
  leerOcultosPublicos: () => void
  /** Páginas públicas: deja solo lo de los avisos que siguen publicados, para que no crezca sin fin. */
  podarPublicos: (vigentes: IAvisoVisible[]) => void
  ocultarPublico: (aviso: IAvisoVisible) => void
}

export const useAvisosServicioStore = create<AvisosServicioState>((set, get) => ({
  activos: [],
  rol: null,
  usuario: null,
  ocultos: {},
  ocultosPublicos: {},

  cargar: async (rol, usuario) => {
    try {
      // La API ya quita los que esta persona cerró en su cuenta.
      const activos = await getAvisosActivos()
      const clave = claveOcultosDe(usuario)
      const respaldo = podarOcultos(leerOcultos(clave), activos)
      guardarOcultos(clave, respaldo)
      const enMemoria = get().usuario === usuario ? get().ocultos : {}
      set({ activos, rol, usuario, ocultos: podarOcultos({ ...respaldo, ...enMemoria }, activos) })
    } catch {
      // Un aviso es ayuda, no un bloqueo: si falla la consulta se deja lo que había.
    }
  },

  ocultar: (aviso) => {
    const usuario = get().usuario
    set({ ocultos: { ...get().ocultos, [aviso.id]: aviso.actualizado_en } })
    cerrarAviso(aviso.id, aviso.actualizado_en).catch((err: unknown) => {
      const que = siNoSeGuardoElCierre(err instanceof ApiClientError ? err.code : undefined)
      if (que === 'deshacer') {
        const { [aviso.id]: _quitado, ...resto } = get().ocultos
        void _quitado
        set({ ocultos: resto })
        return
      }
      if (que === 'olvidar' || !usuario) return
      const clave = claveOcultosDe(usuario)
      guardarOcultos(clave, { ...leerOcultos(clave), [aviso.id]: aviso.actualizado_en })
    })
  },

  leerOcultosPublicos: () => set({ ocultosPublicos: { ...leerOcultos(CLAVE_OCULTOS_PUBLICOS), ...get().ocultosPublicos } }),

  podarPublicos: (vigentes) => {
    const ocultosPublicos = podarOcultos({ ...leerOcultos(CLAVE_OCULTOS_PUBLICOS), ...get().ocultosPublicos }, vigentes)
    guardarOcultos(CLAVE_OCULTOS_PUBLICOS, ocultosPublicos)
    set({ ocultosPublicos })
  },

  ocultarPublico: (aviso) => {
    const ocultosPublicos = { ...get().ocultosPublicos, [aviso.id]: aviso.actualizado_en }
    guardarOcultos(CLAVE_OCULTOS_PUBLICOS, ocultosPublicos)
    set({ ocultosPublicos })
  },
}))
