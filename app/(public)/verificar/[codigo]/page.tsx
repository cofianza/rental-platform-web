/**
 * Pagina publica de verificacion de certificado
 * Accesible sin autenticacion via QR o URL directa
 */

'use client'

import { useState, useEffect, use } from 'react'
import { estudioPublicService } from '@/services/estudioService'
import type { IVerificacionCertificado } from '@/types/estudio'

interface PageProps {
  params: Promise<{ codigo: string }>
}

// Pagina publica: la ve el prospecto (QR / URL del certificado).
// Flujo del modulo de estudios §13: "Nunca usar la palabra 'rechazado' en
// ninguna pantalla dirigida al prospecto", y §10 fija el lexico de la cuarta
// ruta: "No aprobable por ahora. [...] Nunca es un portazo".
// El valor de la clave es el enum de la base (`rechazado`) y NO se toca; lo
// que cambia es lo que lee la persona. El rojo tambien se va: un pill rojo
// comunica portazo aunque la palabra cambie.
//
// 'condicionado' se deja como esta: el §13 solo prohibe la palabra 'rechazado'.
// Ademas el PDF del certificado imprime "CONDICIONADO" (certificado.service.ts)
// y esta pagina es justamente la que prueba que el papel no fue alterado, asi
// que las dos etiquetas tienen que decir lo mismo. Y "con co-arrendatario"
// seria falso cuando el condicionado viene de que el buro no pudo evaluar.
const RESULTADO_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  aprobado: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprobado' },
  condicionado: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Condicionado' },
  rechazado: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'No aprobable por ahora' },
}

// Fallback NEUTRO, nunca 'aprobado'. `verificarCertificado` devuelve
// `resultado: estudio?.resultado || ''`, asi que si la relacion con `estudios`
// viene vacia o trae un estado que no es uno de los tres, el mapa no acierta.
// Caer en 'aprobado' hacia que la pagina que existe para probar autenticidad
// afirmara en verde "Aprobado" sobre un certificado sin estudio que lo respalde.
const BADGE_DESCONOCIDO = { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Resultado no disponible' }

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}

export default function VerificarCertificadoPage({ params }: PageProps) {
  const { codigo } = use(params)
  const [data, setData] = useState<IVerificacionCertificado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetch() {
      try {
        const result = await estudioPublicService.verificarCertificado(codigo)
        setData(result)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [codigo])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">Verificando certificado...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Error de Verificación</h1>
        <p className="text-sm text-gray-600">No se pudo verificar el certificado. Intenta nuevamente.</p>
      </div>
    )
  }

  // INVALIDO
  if (data.status === 'invalido') {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Certificado No Encontrado</h1>
        <p className="text-sm text-gray-600 mb-4">
          El codigo <span className="font-mono font-medium">{codigo}</span> no corresponde a ningun certificado emitido.
        </p>
        <p className="text-xs text-gray-400">
          Si cree que esto es un error, contacte a {data.empresa}.
        </p>
      </div>
    )
  }

  const isVigente = data.status === 'valido_vigente'
  const badge = RESULTADO_BADGES[data.resultado] || BADGE_DESCONOCIDO

  return (
    <div className="max-w-md mx-auto py-8">
      {/* Status header */}
      <div className="text-center mb-8">
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isVigente ? 'bg-green-100' : 'bg-yellow-100'
          }`}
        >
          {isVigente ? (
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          {isVigente ? 'Certificado Valido' : 'Certificado Vencido'}
        </h1>
        <p className="text-sm text-gray-500">
          {isVigente
            ? 'Este certificado es autentico y se encuentra vigente.'
            : 'Este certificado es autentico pero ha expirado.'}
        </p>
      </div>

      {/* Certificate details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Resultado badge */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Resultado del estudio</span>
          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        {/* Details */}
        <div className="px-5 py-2">
          <InfoRow label="Código" value={data.codigo} />
          <InfoRow label="Nombre" value={data.nombre_masked} />
          <InfoRow label="Documento" value={data.numero_documento_masked} />
          <InfoRow label="Dirección" value={data.direccion_masked} />
          <InfoRow label="Fecha emisión" value={formatDate(data.fecha_emision)} />
          <InfoRow label="Fecha vencimiento" value={formatDate(data.fecha_vencimiento)} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Emitido por {data.empresa}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center mt-6 px-4">
        Este certificado fue generado electrónicamente. La información mostrada ha sido parcialmente
        enmascarada por privacidad. Para más información, contacta a {data.empresa}.
      </p>
    </div>
  )
}
