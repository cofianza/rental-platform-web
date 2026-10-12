/**
 * Aviso solo para el administrador: mientras falte el firmante de Cofianza del
 * Acta de Migración (spec migración §3.3), ningún lote se puede enviar a firma.
 * Se vuelve a preguntar al cambiar de página, así desaparece al guardarlo.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconAlertTriangle, IconArrowRight } from '@/components/icons'
import { getEmpresa } from '@/services/empresaService'

const RUTA = '/configuracion/empresa'

export function DatosEmpresaPendientesBanner() {
  const pathname = usePathname()
  const [falta, setFalta] = useState(false)

  useEffect(() => {
    let vivo = true
    getEmpresa()
      .then((e) => {
        const campos = [e.firmanteNombre, e.firmanteTipoDocumento, e.firmanteDocumento, e.firmanteEmail, e.firmanteCelular]
        if (vivo) setFalta(campos.some((c) => !c?.trim()))
      })
      .catch(() => {}) // Un fallo de lectura no debe tapar la página con un aviso falso.
    return () => {
      vivo = false
    }
  }, [pathname])

  if (!falta || pathname === RUTA) return null

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <IconAlertTriangle size={18} className="shrink-0" />
      <p className="min-w-0 flex-1">
        <strong>Faltan datos de la empresa:</strong> configure quién firma por Cofianza el Acta de Migración. Sin esos
        datos ningún lote de migración de cartera se puede enviar a firma.
      </p>
      <Link
        href={RUTA}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
      >
        Completar datos
        <IconArrowRight size={14} />
      </Link>
    </div>
  )
}
