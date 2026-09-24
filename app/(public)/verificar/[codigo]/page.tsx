/**
 * Pagina publica de verificacion de certificado
 * Accesible sin autenticacion via QR o URL directa
 */

'use client'

import { useState, useEffect, use } from 'react'
import { estudioPublicService } from '@/services/estudioService'
import type { IVerificacionCertificado } from '@/types/estudio'
import { IconAlertTriangle, IconCheck, IconX } from '@/components/icons'

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
          <IconX size={32} className="text-red-600" />
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
          <IconX size={32} className="text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Certificado No Encontrado</h1>
        <p className="text-sm text-gray-600 mb-4">
          El código <span className="font-mono font-medium">{codigo}</span> no corresponde a ningún certificado emitido.
        </p>
        <p className="text-xs text-gray-500">
          Si crees que esto es un error, contacta a {data.empresa}.
        </p>
      </div>
    )
  }

  const sinEfecto = data.status === 'sin_efecto'
  const badge = RESULTADO_BADGES[data.resultado] || BADGE_DESCONOCIDO
  // P32: sin efecto no dice por qué ni muestra un resultado que ya no vale.
  const encabezado = sinEfecto
    ? {
        fondo: 'bg-slate-100',
        icono: <IconX size={32} className="text-slate-600" />,
        titulo: 'Certificado sin efecto',
        texto: 'Este certificado es auténtico, pero ya no respalda ningún arrendamiento.',
      }
    : data.status === 'valido_vigente'
      ? {
          fondo: 'bg-green-100',
          icono: <IconCheck size={32} className="text-green-600" />,
          titulo: 'Certificado Válido',
          texto: 'Este certificado es auténtico y se encuentra vigente.',
        }
      : {
          fondo: 'bg-yellow-100',
          icono: <IconAlertTriangle size={32} className="text-yellow-600" />,
          titulo: 'Certificado Vencido',
          texto: 'Este certificado es auténtico pero ha expirado.',
        }

  return (
    <div className="max-w-md mx-auto py-8">
      {/* Status header */}
      <div className="text-center mb-8">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${encabezado.fondo}`}>
          {encabezado.icono}
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{encabezado.titulo}</h1>
        <p className="text-sm text-gray-500">{encabezado.texto}</p>
      </div>

      {/* Certificate details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Resultado badge */}
        {!sinEfecto && (
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Resultado del estudio</span>
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Details: P10, identidad reducida y sin dirección */}
        <div className="px-5 py-2">
          <InfoRow label="Código" value={data.codigo} />
          <InfoRow label="Nombre" value={data.nombre_masked} />
          <InfoRow label="Documento" value={data.numero_documento_masked} />
          <InfoRow label="Fecha emisión" value={formatDate(data.fecha_emision)} />
          <InfoRow label="Fecha vencimiento" value={formatDate(data.fecha_vencimiento)} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Emitido por {data.empresa}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 text-center mt-6 px-4">
        Este certificado fue generado electrónicamente. La información mostrada ha sido parcialmente
        enmascarada por privacidad. Para más información, contacta a {data.empresa}.
      </p>
    </div>
  )
}
