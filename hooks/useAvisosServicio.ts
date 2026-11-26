/**
 * Avisos de servicio del banner: los pide al entrar, cada pocos minutos y al
 * volver a la pestaña, para que quien tiene el panel abierto vea la falla (y
 * su arreglo) sin recargar. Los que la persona cerró no vuelven (se guardan en
 * su cuenta; ver avisosServicio.store).
 */

'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useAvisosServicioStore } from '@/stores/avisosServicio.store'
import { avisosAMostrar } from '@/lib/avisosServicio'

const CADA_MS = 3 * 60 * 1000

export function useAvisosServicio() {
  const rol = useAuthStore((s) => s.user?.rol)
  const usuario = useAuthStore((s) => s.user?.id)
  const activos = useAvisosServicioStore((s) => s.activos)
  const rolCargado = useAvisosServicioStore((s) => s.rol)
  const usuarioCargado = useAvisosServicioStore((s) => s.usuario)
  const ocultos = useAvisosServicioStore((s) => s.ocultos)
  const cargar = useAvisosServicioStore((s) => s.cargar)
  const ocultar = useAvisosServicioStore((s) => s.ocultar)

  useEffect(() => {
    if (!rol || !usuario) return
    void cargar(rol, usuario)
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') void cargar(rol, usuario)
    }, CADA_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') void cargar(rol, usuario)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [rol, usuario, cargar])

  const avisos = rol && rolCargado === rol && usuario && usuarioCargado === usuario ? avisosAMostrar(activos, ocultos) : []
  return { avisos, ocultar, esEquipo: rol === 'administrador' || rol === 'operador_analista' || rol === 'gerencia_consulta', esAdmin: rol === 'administrador' }
}
