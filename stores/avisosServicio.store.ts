/**
 * Avisos de servicio vigentes para la sesión (el banner de los tres shells).
 * En un store para que la pantalla del administrador lo refresque al guardar
 * y el banner cambie en el acto. Los que la persona ocultó se recuerdan en
 * este navegador por versión (id + actualizado_en).
 */

import { create } from 'zustand'
import { getAvisosActivos } from '@/services/avisosServicioService'
import { podarOcultos, type AvisosOcultos } from '@/lib/avisosServicio'
import type { IAvisoVisible } from '@/types/avisosServicio'

const CLAVE_OCULTOS = 'hp-avisos-ocultos'

function leerOcultos(): AvisosOcultos {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_OCULTOS) ?? '{}') as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as AvisosOcultos) : {}
  } catch {
    return {}
  }
}

function guardarOcultos(ocultos: AvisosOcultos) {
  try {
    localStorage.setItem(CLAVE_OCULTOS, JSON.stringify(ocultos))
  } catch {}
}

interface AvisosServicioState {
  activos: IAvisoVisible[]
  /** Rol con el que se pidieron: al cambiar de cuenta en la misma pestaña no se muestran los de la anterior. */
  rol: string | null
  ocultos: AvisosOcultos
  cargar: (rol: string) => Promise<void>
  /** Páginas públicas: trae lo ocultado en este navegador sin pedir los avisos del panel. */
  leerOcultos: () => void
  ocultar: (aviso: IAvisoVisible) => void
}

export const useAvisosServicioStore = create<AvisosServicioState>((set, get) => ({
  activos: [],
  rol: null,
  ocultos: {},

  cargar: async (rol) => {
    try {
      const activos = await getAvisosActivos()
      const ocultos = podarOcultos({ ...leerOcultos(), ...get().ocultos }, activos)
      guardarOcultos(ocultos)
      set({ activos, rol, ocultos })
    } catch {
      // Un aviso es ayuda, no un bloqueo: si falla la consulta se deja lo que había.
    }
  },

  leerOcultos: () => set({ ocultos: { ...leerOcultos(), ...get().ocultos } }),

  ocultar: (aviso) => {
    const ocultos = { ...get().ocultos, [aviso.id]: aviso.actualizado_en }
    guardarOcultos(ocultos)
    set({ ocultos })
  },
}))
