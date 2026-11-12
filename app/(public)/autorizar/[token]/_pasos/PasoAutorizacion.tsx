'use client'

import { cn } from '@/lib/utils'
import { CONTACTO_COFIANZA, formatCurrency } from '@/lib/constants'
import {
  IconShieldCheck,
  IconChevronDown,
  IconLoader,
  IconId,
  IconUserCheck,
  IconUserX,
  IconArrowRight,
} from '@/components/icons'
import { nombreDocumento } from '@/components/public/CapturaBiometrica'
import { buttonClasses } from '@/components/ui/Button'
import { CampoCorreoResultado } from '@/components/public/CampoCorreoResultado'
import type { IAutorizacionPublicData } from '@/types/autorizacion'
import { CON_BIOMETRIA, FINALIDADES, SIN_DATOS_SENSIBLES } from './constantes'
import { formatearDocumento, textoIntentos } from './textos'

/**
 * Paso 1 · Obligatorio. Primero «¿Es usted?» (§8.1: escribe su documento y
 * la API lo compara). Solo con la identidad confirmada aparecen las
 * finalidades, el texto legal íntegro (§8.4) y la casilla de aceptación.
 */
export function PasoAutorizacion({
  data,
  quien,
  intentos,
  identidadOk,
  repasoDoc,
  documento,
  documentoError,
  verificandoDoc,
  conBiometria,
  openFin,
  setOpenFin,
  correoResultado,
  errorCorreo,
  acepta,
  setAcepta,
  onCambiarDocumento,
  onRepasarDocumento,
  onConfirmarIdentidad,
  onCorregirDocumento,
  onReportar,
  onCambiarCorreo,
  onAceptarYContinuar,
}: {
  data: IAutorizacionPublicData
  quien: string
  intentos: number | null
  identidadOk: boolean
  repasoDoc: boolean
  documento: string
  documentoError: string
  verificandoDoc: boolean
  conBiometria: boolean
  openFin: number | null
  setOpenFin: (i: number | null) => void
  correoResultado: string
  errorCorreo: boolean
  acepta: boolean
  setAcepta: (v: boolean) => void
  onCambiarDocumento: (valor: string) => void
  onRepasarDocumento: (e: React.FormEvent) => void
  onConfirmarIdentidad: () => void
  onCorregirDocumento: () => void
  onReportar: () => void
  onCambiarCorreo: (v: string) => void
  onAceptarYContinuar: () => void
}) {
  return (
    <div className="space-y-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-700">
        <IconShieldCheck size={13} /> Paso 1 · Obligatorio
      </span>
      {/*
        §8.1 Confirmación de identidad. Va PRIMERO y gatea el resto del
        paso: confirmar quién eres antes de leer qué autorizas es el orden
        lógico, y así el prospecto no aterriza en un muro legal.

        El número NO se muestra: el prospecto lo escribe y la API lo
        compara (handleConfirmarIdentidad). §12: "la confirmación de
        identidad y el registro del documento aceptante son la defensa"
        contra un enlace reenviado a un tercero.
      */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            <IconId size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-gray-900">¿Es usted?</h1>
            <p className="mt-2 break-words text-base font-bold text-gray-900">
              {data.solicitante.nombre} {data.solicitante.apellido}
            </p>
            {/* A1: quién pide el estudio y qué es Cofianza ANTES de pedir el
                documento; sin eso la página se parecía a un phishing. Sin
                `solicitado_por` (API vieja) cae a un sujeto genérico. */}
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              <strong>{quien}</strong> está haciendo su estudio
              {data.expediente.inmueble ? (
                <>
                  {' '}para arrendar el inmueble en {data.expediente.inmueble.direccion}
                  {data.expediente.inmueble.ciudad ? `, ${data.expediente.inmueble.ciudad}` : ''}
                </>
              ) : data.expediente.canon_objetivo_cop ? (
                ` para un arriendo con un canon de ${formatCurrency(data.expediente.canon_objetivo_cop)} (el inmueble se define después)`
              ) : (
                ' para un arriendo (el inmueble se define después)'
              )}
              . Cofianza es la empresa que respalda ese arriendo como fiadora.
            </p>
            {/* A2: el cobro se dice aquí, no después de firmar. */}
            {data.pago?.requerido && (
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                El estudio tiene un costo{data.pago.monto_formateado ? ` de ${data.pago.monto_formateado}` : ''}.
                Lo paga al final, después de autorizar.
              </p>
            )}
            {data.pago?.requerido === false && (
              <p className="mt-2 text-sm leading-relaxed text-gray-700">Usted no tiene que pagar nada por este estudio.</p>
            )}
            {/* Sin dato del cobro (la API no pudo saberlo): ni «hay costo» ni «no hay costo». */}
            {data.pago == null && (
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                {quien} le indicará si tiene costo.
              </p>
            )}
            {/* B2: lo de Mercado Pago solo a quien le toca pagar. */}
            <p className="mt-2 text-xs text-gray-500">
              Nunca le pediremos contraseñas.
              {data.pago?.requerido ? ' El pago del estudio se hace solo en Mercado Pago.' : ''}
            </p>
            <p className="mt-1 text-xs text-gray-500">Estudio {data.expediente.numero_expediente}</p>
          </div>
        </div>

        {identidadOk ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary-700">
            <IconUserCheck size={14} /> Confirmó que es usted
          </p>
        ) : repasoDoc ? (
          <div className="mt-4 space-y-3" role="group" aria-labelledby="repaso-doc-titulo">
            <p id="repaso-doc-titulo" className="text-sm text-gray-700">
              Escribió este número de {nombreDocumento(data.solicitante.tipo_documento)}:
            </p>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-center font-mono text-2xl font-bold tracking-wide break-all text-gray-900">
              {formatearDocumento(documento, data.solicitante.tipo_documento)}
            </p>
            <p className="text-sm font-bold text-gray-900">¿Es correcto?</p>
            <p className="text-xs leading-relaxed text-gray-500">
              Revíselo bien: {intentos != null ? textoIntentos(intentos).toLowerCase() : 'tiene un número limitado de intentos'}. Si se agotan, {quien} revisará sus datos
              y le enviará un enlace nuevo.
            </p>
            <button
              type="button"
              onClick={onConfirmarIdentidad}
              disabled={verificandoDoc}
              className={buttonClasses('primary', 'lg', 'w-full')}
            >
              {verificandoDoc && <IconLoader size={18} className="animate-spin" />}
              {verificandoDoc ? 'Revisando…' : 'Sí, continuar'}
            </button>
            <button
              type="button"
              onClick={onCorregirDocumento}
              disabled={verificandoDoc}
              className={buttonClasses('secondary', 'lg', 'w-full')}
            >
              Corregir
            </button>
          </div>
        ) : (
          <form onSubmit={onRepasarDocumento} className="mt-4 space-y-2" noValidate>
            <label htmlFor="numero-documento" className="block text-sm font-bold text-gray-900">
              Escriba su número de {nombreDocumento(data.solicitante.tipo_documento)}
            </label>
            <input
              id="numero-documento"
              type="text"
              inputMode={data.solicitante.tipo_documento === 'pasaporte' ? 'text' : 'numeric'}
              autoComplete="off"
              value={documento}
              maxLength={30}
              onChange={(e) => onCambiarDocumento(e.target.value)}
              aria-describedby="numero-documento-ayuda"
              aria-invalid={!!documentoError}
              disabled={verificandoDoc}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
              placeholder="Ej.: 1023456789"
            />
            <p id="numero-documento-ayuda" className="text-xs leading-relaxed text-gray-500">
              Lo comparamos con el que está registrado en su estudio; por su seguridad no se lo
              mostramos.{intentos != null && !documentoError ? ` ${textoIntentos(intentos)}.` : ''}
            </p>
            {documentoError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {documentoError}
              </p>
            )}
            <button
              type="submit"
              disabled={verificandoDoc || !documento.trim()}
              className={buttonClasses('primary', 'lg', 'w-full')}
            >
              Sí, soy yo
            </button>
            <button
              type="button"
              onClick={onReportar}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <IconUserX size={16} className="shrink-0" aria-hidden /> No soy yo o no reconozco esta solicitud
            </button>
          </form>
        )}
      </div>

      {identidadOk && (
      <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Autorice el uso de sus datos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Para hacer su estudio y actuar como su fiador, {data.solicitante.nombre}, necesitamos tratar
          sus datos. Toque cada punto para ver el detalle:
        </p>
      </div>

      {/* Finalidades (acordeones) */}
      <div className="space-y-2.5">
        {FINALIDADES.map((f, i) => {
          const open = openFin === i
          return (
            <div key={f.titulo} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenFin(open ? null : i)}
                aria-expanded={open}
                aria-controls={`finalidad-${i}`}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <f.Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-900">{f.titulo}</span>
                  <span className="block text-[11px] text-gray-500">{f.sub}</span>
                </span>
                <IconChevronDown
                  size={16}
                  className={cn('shrink-0 text-gray-500 transition-transform', open && 'rotate-180')}
                />
              </button>
              {open && (
                <ul id={`finalidad-${i}`} className="space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                  {f.detalle.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                      <span>{d === SIN_DATOS_SENSIBLES && conBiometria ? CON_BIOMETRIA : d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/*
        Autorización legal completa, SIEMPRE visible.
        Flujo del módulo de estudios §8.4: "El texto de la autorización
        debe estar visible en la pantalla, no oculto tras un enlace".
        Antes vivía tras un desplegable "Ver autorización legal completa".
        No volver a esconderlo tras un botón, un modal ni un enlace.
      */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Autorización legal completa</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Este es el texto íntegro que está aceptando. Versión {data.version_terminos}.
          </p>
        </div>
        <div className="whitespace-pre-wrap break-words bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          {data.texto_legal}
        </div>
      </div>

      {/* Ley 1581 art. 8 + Decreto 1377 art. 9: el titular revoca ante Cofianza, por este canal. */}
      <p className="text-xs leading-relaxed text-gray-500">
        Puede revocar esta autorización cuando quiera escribiéndonos a{' '}
        <a href={`mailto:${CONTACTO_COFIANZA.email}`} className="font-medium text-primary-700 underline">
          {CONTACTO_COFIANZA.email}
        </a>
        . La revocación la hace usted, ante Cofianza.
      </p>

      {/* Fuera del texto legal: dónde quiere recibir el resultado (solo si la API lo pide). */}
      {data.contacto_resultado?.requerido && (
        <CampoCorreoResultado
          valor={correoResultado}
          onCambio={onCambiarCorreo}
          mostrarError={errorCorreo}
        />
      )}

      {/* Aceptación */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">
          <strong>He leído, comprendido y acepto</strong> la autorización de tratamiento de datos y la{' '}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Política de Privacidad de Cofianza S.A.S.
          </a>
        </span>
      </label>

      <button
        type="button"
        onClick={onAceptarYContinuar}
        disabled={!acepta}
        className={buttonClasses('primary', 'lg', 'w-full')}
      >
        Acepto y continúo <IconArrowRight size={16} />
      </button>
      </div>
      )}
    </div>
  )
}
