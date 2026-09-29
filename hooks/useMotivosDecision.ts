/**
 * Catálogo de motivos de decisión (H58/H103). Se pide una vez por sesión: no
 * cambia mientras la página está abierta. Si el API no lo tiene (versión
 * anterior) o no deja leerlo, `catalogo` queda null y los formularios siguen
 * con sus campos de texto de siempre.
 */

'use client'

import { useEffect, useState } from 'react'
import { estudioService } from '@/services/estudioService'
import type { ICatalogoMotivos } from '@/types/estudio'

let cache: ICatalogoMotivos | null = null
let enCurso: Promise<ICatalogoMotivos | null> | null = null

/** `habilitado=false` para roles que no deciden (el API responde 403 a los de fuera de Cofianza). */
export function useMotivosDecision(habilitado = true) {
  const [catalogo, setCatalogo] = useState<ICatalogoMotivos | null>(cache)
  // B14: `cargando` se deriva: si `habilitado` pasa a true después (el rol llega
  // tarde), también cuenta como carga en curso.
  const [terminado, setTerminado] = useState(false)

  useEffect(() => {
    if (cache || !habilitado) return
    let vivo = true
    enCurso ??= estudioService
      .getMotivosDecision()
      .then((c) => (cache = c))
      .catch(() => {
        enCurso = null // un fallo no queda cacheado: el próximo modal reintenta
        return null
      })
    enCurso.then((c) => {
      if (!vivo) return
      setCatalogo(c)
      setTerminado(true)
    })
    return () => {
      vivo = false
    }
  }, [habilitado])

  return { catalogo: habilitado ? catalogo : null, cargando: habilitado && !catalogo && !terminado }
}
