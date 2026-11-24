/**
 * Avisos de servicio del banner: los pide al entrar, cada pocos minutos y al
 * volver a la pestaña, para que quien tiene el panel abierto vea la falla (y
 * su arreglo) sin recargar.
 */

'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useAvisosServicioStore } from '@/stores/avisosServicio.store'
import { avisosAMostrar } from '@/lib/avisosServicio'

const CADA_MS = 3 * 60 * 1000

export function useAvisosServicio() {
  const rol = useAuthStore((s) => s.user?.rol)
  const activos = useAvisosServicioStore((s) => s.activos)
  const rolCargado = useAvisosServicioStore((s) => s.rol)
  const ocultos = useAvisosServicioStore((s) => s.ocultos)
  const cargar = useAvisosServicioStore((s) => s.cargar)
  const ocultar = useAvisosServicioStore((s) => s.ocultar)

  useEffect(() => {
    if (!rol) return
    void cargar(rol)
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') void cargar(rol)
    }, CADA_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') void cargar(rol)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [rol, cargar])

  const avisos = rol && rolCargado === rol ? avisosAMostrar(activos, ocultos) : []
  return { avisos, ocultar, esEquipo: rol === 'administrador' || rol === 'operador_analista' || rol === 'gerencia_consulta', esAdmin: rol === 'administrador' }
}
