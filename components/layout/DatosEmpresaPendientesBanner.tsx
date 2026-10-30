/**
 * Aviso solo para el administrador: mientras falte el firmante de Cofianza del
 * Acta de Migración (spec migración §3.3), ningún lote se puede enviar a firma.
 * U10 (revisión 30-oct): solo en Inicio, Migración y Configuración, en ámbar y
 * sin role="alert" (es un pendiente, no un error), más un modal una vez por
 * sesión. Se vuelve a preguntar al cambiar entre esas páginas, así desaparece
 * al guardarlo; en las demás no se consulta la API.
 */

'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { IconAlertTriangle, IconArrowRight } from '@/components/icons'
import { Modal } from '@/components/ui/Modal'
import { useFirmantePendienteStore } from '@/stores/firmantePendiente.store'

export const RUTA_DATOS_EMPRESA = '/configuracion/empresa'
const CLAVE_SESION = 'hp-aviso-firmante'

/** Dónde se muestra el aviso (U10). Pura. */
export function muestraAvisoDatosEmpresa(pathname: string): boolean {
  if (pathname === RUTA_DATOS_EMPRESA) return false
  return (
    pathname === '/dashboard' ||
    pathname === '/admin/migracion' ||
    pathname.startsWith('/admin/migracion/') ||
    pathname === '/configuracion' ||
    pathname.startsWith('/configuracion/')
  )
}

// ¿Ya se cerró el modal en esta sesión? sessionStorage no avisa cambios en la
// misma pestaña (no hay a qué suscribirse); el cierre de ahora lo lleva el estado.
const sinSuscripcion = () => () => {}
function vistoEnSesion(): boolean {
  try {
    return !!sessionStorage.getItem(CLAVE_SESION)
  } catch {
    return false
  }
}

export function DatosEmpresaPendientesBanner() {
  const pathname = usePathname()
  const router = useRouter()
  const falta = useFirmantePendienteStore((st) => st.falta)
  const cargar = useFirmantePendienteStore((st) => st.cargar)
  // El modal se deriva (antes un efecto lo abría): sale una vez por sesión
  // mientras falte el dato. En el servidor no se sabe, así que no se pinta.
  const visto = useSyncExternalStore(sinSuscripcion, vistoEnSesion, () => true)
  const [cerrado, setCerrado] = useState(false)

  const aplica = muestraAvisoDatosEmpresa(pathname)
  const modal = !!falta && aplica && !visto && !cerrado

  useEffect(() => {
    if (aplica) void cargar()
  }, [pathname, aplica, cargar])

  function cerrar() {
    try {
      sessionStorage.setItem(CLAVE_SESION, '1')
    } catch {}
    setCerrado(true)
  }

  if (!falta || !aplica) return null

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <IconAlertTriangle size={18} className="shrink-0" />
        <p className="min-w-0 flex-1">
          <strong>Dato obligatorio pendiente:</strong> configure quién firma por Cofianza el Acta de Migración. Sin esos datos
          ningún lote de migración de cartera se puede enviar a firma.
        </p>
        <Link
          href={RUTA_DATOS_EMPRESA}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white hover:bg-amber-800"
        >
          Completar datos
          <IconArrowRight size={14} />
        </Link>
      </div>

      <Modal isOpen={modal} onClose={cerrar} title="Dato obligatorio pendiente" size="md" closeOnBackdrop={false}>
        <div className="space-y-4 text-sm text-gray-700">
          <p className="flex items-start gap-2">
            <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <span>
              Falta registrar a la persona que firma por Cofianza el Acta de Migración de cartera: nombre, documento, correo y
              WhatsApp. Mientras no esté, <strong>ningún lote de migración se puede enviar a firma</strong>.
            </span>
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={() => {
                cerrar()
                router.push(RUTA_DATOS_EMPRESA)
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800"
            >
              Completar ahora
              <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
