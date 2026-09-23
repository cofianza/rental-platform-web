'use client'

import { createContext, useContext } from 'react'

/**
 * Sube cada vez que el detalle del estudio vuelve a cargar (tras una acción o
 * un aviso en segundo plano). Las tarjetas lo ponen en las dependencias de su
 * carga: se refrescan en sitio, sin desmontarse (antes se remontaba todo y las
 * tarjetas desaparecían un momento). Fuera del detalle vale 0 y no hace nada.
 */
export const ExpedienteRefrescoContext = createContext(0)

export const useRefrescoExpediente = () => useContext(ExpedienteRefrescoContext)
