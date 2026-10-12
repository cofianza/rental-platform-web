/**
 * ¿Falta el firmante de Cofianza del Acta de Migración (spec migración §3.3)?
 * Lo comparten el aviso, el modal, el menú y la página del lote: una sola lectura.
 */

import { create } from 'zustand'
import { getEmpresa } from '@/services/empresaService'

interface FirmantePendienteState {
  /** null = aún no se sabe (no se muestra nada). */
  falta: boolean | null
  cargar: () => Promise<void>
}

export const useFirmantePendienteStore = create<FirmantePendienteState>((set) => ({
  falta: null,
  cargar: async () => {
    try {
      const e = await getEmpresa()
      const campos = [e.firmanteNombre, e.firmanteTipoDocumento, e.firmanteDocumento, e.firmanteEmail, e.firmanteCelular]
      set({ falta: campos.some((c) => !c?.trim()) })
    } catch {
      // Un fallo de lectura no debe mostrar un aviso falso.
    }
  },
}))
