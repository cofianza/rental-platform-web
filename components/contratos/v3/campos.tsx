/**
 * Controles compartidos del asistente de contratos V3 (Entrega 3).
 *
 * No hay Input/Select compartidos en components/ui: se copian los estilos de
 * Datos para contrato (Field) y de la tarjeta de radio del asistente de
 * estudios (Step3Configuration) para que el asistente se vea igual al resto.
 */

'use client'

import { useId, type ComponentType, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconAlertTriangle, IconCheck, IconInfo, IconShieldCheck, type IconProps } from '@/components/icons'

/** Etiquetas de los documentos (enum tipo_documento de la BD, con 'ti'). */
const TIPO_DOCUMENTO: Record<string, string> = {
  cc: 'C.C.',
  ce: 'C.E.',
  pasaporte: 'Pasaporte',
  nit: 'NIT',
  ti: 'T.I.',
}

export const documento = (tipo: string, numero: string) =>
  `${TIPO_DOCUMENTO[tipo] ?? tipo.toUpperCase()} ${numero}`

/** "2,5" — porcentajes es-CO con hasta dos decimales (como el contrato). */
export const porcentaje = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 })

/** Valor de un <input type="number">: vacío = sin responder. */
export const numeroDe = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v))

export const inputClass = (error?: string) =>
  cn(
    'w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
    'disabled:cursor-not-allowed disabled:bg-gray-100',
    error ? 'border-red-300 bg-red-50' : 'border-gray-300',
  )

function Etiqueta({ htmlFor, children, requerido }: { htmlFor?: string; children: ReactNode; requerido?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
      {children}
      {requerido && <span className="text-coral-500"> *</span>}
    </label>
  )
}

function Ayuda({ error, help }: { error?: string; help?: ReactNode }) {
  return (
    <>
      {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </>
  )
}

interface CampoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'required'> {
  label: string
  error?: string
  help?: ReactNode
  requerido?: boolean
}

/** Input con etiqueta, ayuda y error (mismo look que Field de Datos para contrato). */
export function Campo({ label, error, help, requerido, ...input }: CampoProps) {
  const id = useId()
  return (
    <div>
      <Etiqueta htmlFor={id} requerido={requerido}>
        {label}
      </Etiqueta>
      <input id={id} aria-invalid={!!error} className={inputClass(error)} {...input} />
      <Ayuda error={error} help={help} />
    </div>
  )
}

/** Pregunta Sí/No obligatoria. `undefined` = sin responder (nada marcado). */
export function SiNo({
  label,
  value,
  onChange,
  error,
  help,
}: {
  label: string
  value: boolean | undefined
  onChange: (v: boolean) => void
  error?: string
  help?: ReactNode
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        <span className="text-coral-500"> *</span>
      </legend>
      <div className="flex gap-2">
        {[true, false].map((v) => (
          <label
            key={String(v)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition',
              value === v
                ? 'border-primary-500 bg-primary-50/60 font-medium text-primary-700 ring-1 ring-primary-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50',
              error && value === undefined && 'border-red-300',
            )}
          >
            <input
              type="radio"
              name={name}
              checked={value === v}
              onChange={() => onChange(v)}
              className="accent-primary-600"
            />
            {v ? 'Sí' : 'No'}
          </label>
        ))}
      </div>
      <Ayuda error={error} help={help} />
    </fieldset>
  )
}

/** Tarjeta de radio (sr-only + tile de icono), como Step3Configuration. */
export function OpcionTarjeta({
  name,
  checked,
  disabled,
  onSelect,
  titulo,
  descripcion,
  insignia,
  icono: Icono,
}: {
  name: string
  checked: boolean
  disabled?: boolean
  onSelect: () => void
  titulo: string
  descripcion?: string
  insignia?: string
  icono: ComponentType<IconProps>
}) {
  return (
    <label
      className={cn(
        // El radio es sr-only: el foco de teclado se pinta en la tarjeta.
        'flex items-start gap-3 rounded-xl border p-4 transition has-focus-visible:ring-2 has-focus-visible:ring-primary-500 has-focus-visible:ring-offset-2',
        checked
          ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
        disabled ? 'cursor-not-allowed opacity-60 hover:border-gray-200 hover:bg-transparent' : 'cursor-pointer',
      )}
    >
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} className="sr-only" />
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          checked ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500',
        )}
      >
        {checked ? <IconCheck size={18} /> : <Icono size={18} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{titulo}</span>
          {insignia && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">{insignia}</span>
          )}
        </span>
        {descripcion && <span className="mt-1 block text-sm text-gray-500">{descripcion}</span>}
      </span>
    </label>
  )
}

/** Encabezado de paso (punto + título display), como Step4Confirmation. */
export function EncabezadoPaso({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
        <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
        {titulo}
      </h2>
      {subtitulo && <p className="mt-1 text-sm text-gray-500">{subtitulo}</p>}
    </div>
  )
}

/** Tarjeta de solo lectura con título, datos y pie (nota o enlace). */
export function Tarjeta({
  titulo,
  icono: Icono,
  insignia,
  children,
  pie,
}: {
  titulo: string
  icono: ComponentType<IconProps>
  insignia?: ReactNode
  children: ReactNode
  pie?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Icono size={18} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        {insignia}
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">{children}</dl>
      {pie && <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">{pie}</div>}
    </section>
  )
}

export function Dato({ label, valor, ancho }: { label: string; valor: ReactNode; ancho?: boolean }) {
  return (
    <div className={cn('min-w-0', ancho && 'sm:col-span-2')}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-gray-900">
        {valor === null || valor === undefined || valor === '' ? <span className="text-gray-400">Sin registrar</span> : valor}
      </dd>
    </div>
  )
}

const TONOS = {
  info: { caja: 'border-blue-200 bg-blue-50 text-blue-800', icono: 'text-blue-600', Icono: IconInfo },
  aviso: { caja: 'border-amber-200 bg-amber-50 text-amber-800', icono: 'text-amber-600', Icono: IconAlertTriangle },
  error: { caja: 'border-red-200 bg-red-50 text-red-800', icono: 'text-red-600', Icono: IconAlertTriangle },
  exito: { caja: 'border-green-200 bg-green-50 text-green-800', icono: 'text-green-600', Icono: IconShieldCheck },
} as const

/** Nota en caja de color: info (no bloquea), aviso, error o éxito. */
export function Aviso({ tono = 'info', children }: { tono?: keyof typeof TONOS; children: ReactNode }) {
  const t = TONOS[tono]
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-sm', t.caja)}>
      <t.Icono size={18} className={cn('mt-0.5 shrink-0', t.icono)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
