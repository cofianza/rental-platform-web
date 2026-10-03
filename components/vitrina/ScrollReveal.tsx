/**
 * ScrollReveal — hace aparecer cada `.reveal` de la página al entrar en
 * pantalla (diseño Landing v2). Solo oculta los elementos cuando este efecto
 * corre: sin JS o con «reducir movimiento» todo queda visible desde el inicio.
 */

'use client'

import { useEffect } from 'react'

export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el))
    root.classList.add('reveal-on')
    return () => {
      obs.disconnect()
      root.classList.remove('reveal-on')
    }
  }, [])
  return null
}
