/**
 * Pagina publica de resultado del pago - HP-353
 * Accesible sin autenticacion (el arrendatario no tiene cuenta)
 * Muestra resultado del pago tras redireccion de Stripe
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

function PagoResultadoContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const expedienteId = searchParams.get('expediente')
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAuthInitialized = useAuthStore((s) => s.isInitialized)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Small delay to let the page render with branding before showing result
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">Procesando resultado del pago...</p>
      </div>
    )
  }

  const isSuccess = status === 'success'
  const isCancelled = status === 'cancelled'

  return (
    <div className="max-w-md mx-auto py-8">
      {/* Status icon */}
      <div className="text-center mb-8">
        <div
          className={`w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center ${
            isSuccess ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          {isSuccess ? (
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {isSuccess ? 'Pago exitoso' : isCancelled ? 'Pago cancelado' : 'Pago fallido'}
        </h1>

        <p className="text-sm text-gray-600 max-w-sm mx-auto">
          {isSuccess
            ? 'Tu pago del estudio de arrendamiento ha sido procesado correctamente. El equipo de la inmobiliaria continuara con el proceso.'
            : isCancelled
              ? 'Has cancelado el proceso de pago. Puedes volver a intentarlo usando el link que recibiste por correo.'
              : 'Hubo un problema al procesar tu pago. Por favor intenta nuevamente usando el link que recibiste por correo.'}
        </p>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Detalle</p>
        </div>
        <div className="px-5 py-3 space-y-0">
          <div className="flex justify-between py-2.5 border-b border-gray-100">
            <span className="text-sm text-gray-500">Concepto</span>
            <span className="text-sm font-medium text-gray-900">Estudio de arrendamiento</span>
          </div>
          <div className="flex justify-between py-2.5 border-b border-gray-100">
            <span className="text-sm text-gray-500">Estado</span>
            <span
              className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                isSuccess
                  ? 'bg-green-100 text-green-800'
                  : isCancelled
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {isSuccess ? 'Completado' : isCancelled ? 'Cancelado' : 'Fallido'}
            </span>
          </div>
          {expedienteId && (
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-gray-500">Referencia</span>
              <span className="text-sm font-medium text-gray-900 font-mono">
                {expedienteId.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Help text */}
      {isSuccess ? (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            {isAuthenticated
              ? 'Ya puedes regresar a tu panel para ver el avance del estudio crediticio.'
              : 'No necesitas hacer nada mas. La inmobiliaria te contactara para los siguientes pasos del proceso de arrendamiento.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Si tienes dudas o necesitas ayuda, comunicate con la inmobiliaria que te envio el link de pago.
          </p>
        </div>
      )}

      {/* CTA: cuando el usuario tiene sesion, lo regresamos a su expediente
          (o dashboard si no hay id). Si no tiene sesion, es flujo legacy de
          invitado: mostramos solo el mensaje de cerrar ventana. */}
      {isAuthInitialized && isAuthenticated && (
        <div className="mt-6 flex justify-center">
          <Link
            href={expedienteId ? `/expedientes/${expedienteId}` : '/dashboard'}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            {expedienteId ? 'Ver mi expediente' : 'Ir a mi panel'}
          </Link>
        </div>
      )}

      {/* Footer — texto distinto segun haya o no sesion */}
      <p className="text-xs text-gray-400 text-center mt-8">
        {isAuthInitialized && isAuthenticated
          ? 'Tambien puedes cerrar esta ventana — el estado quedo guardado.'
          : 'Puedes cerrar esta ventana de forma segura.'}
      </p>
    </div>
  )
}

export default function PagoResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-4">Cargando...</p>
        </div>
      }
    >
      <PagoResultadoContent />
    </Suspense>
  )
}
