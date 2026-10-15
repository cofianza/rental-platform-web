/**
 * ¿Falta el firmante de Cofianza del Acta de Migración (spec migración §3.3)?
 * Lo comparten el aviso, el modal, el menú y la página del lote: una sola lectura.
 * El operador también lo sabe, para no ofrecerle «Enviar a firma» en vano.
 */

import { create } from 'zustand'
import { firmanteConfigurado } from '@/services/empresaService'

interface FirmantePendienteState {
  /** null = aún no se sabe (no se muestra nada). */
  falta: boolean | null
  cargar: () => Promise<void>
}

export const useFirmantePendienteStore = create<FirmantePendienteState>((set) => ({
  falta: null,
  cargar: async () => {
    try {
      set({ falta: !(await firmanteConfigurado()) })
    } catch {
      // Un fallo de lectura no debe mostrar un aviso falso.
    }
  },
}))
