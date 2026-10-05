'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { cn } from '@/lib/utils'

interface CountryCode {
  code: string
  dial: string
  flag: string
  name: string
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'CO', dial: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'MX', dial: '+52', flag: '🇲🇽', name: 'México' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'España' },
  { code: 'AR', dial: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'CL', dial: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: 'PE', dial: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: 'EC', dial: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: 'VE', dial: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: 'PA', dial: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: 'BR', dial: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: 'CR', dial: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: 'DO', dial: '+1-809', flag: '🇩🇴', name: 'República Dominicana' },
  { code: 'GT', dial: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: 'UY', dial: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: 'BO', dial: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: 'PY', dial: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: 'HN', dial: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: 'SV', dial: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: 'NI', dial: '+505', flag: '🇳🇮', name: 'Nicaragua' },
]

/** Sin tildes ni mayúsculas, para que «espana» o «mexico» encuentren su país. */
const plano = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Parses a full phone value like "+57 3101234567" into country dial code and local number.
 */
function parsePhoneValue(value: string): { dial: string; local: string } {
  if (!value) return { dial: '+57', local: '' }

  // Try to match known dial codes (longest first to handle +1-809 etc.)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length)
  for (const country of sorted) {
    const prefix = country.dial.replace('-', '')
    const cleanValue = value.replace(/[\s-]/g, '')
    if (cleanValue.startsWith(prefix)) {
      return { dial: country.dial, local: cleanValue.slice(prefix.length) }
    }
  }

  // If starts with + but no match, try extracting
  if (value.startsWith('+')) {
    const parts = value.trim().split(/\s+/)
    if (parts.length >= 2) {
      return { dial: parts[0], local: parts.slice(1).join('') }
    }
    return { dial: '+57', local: value.replace(/^\+\d+\s*/, '') }
  }

  return { dial: '+57', local: value }
}

interface PhoneInputProps {
  value: string
  onChange: (fullValue: string) => void
  error?: string
  disabled?: boolean
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  icon?: React.ReactNode
  /** «auth»: campo del diseño de login/registro (borde 1,5 px, 15 px de letra). */
  variant?: 'default' | 'auth'
}

export function PhoneInput({
  value,
  onChange,
  error,
  disabled,
  placeholder,
  label,
  required,
  className,
  icon,
  variant = 'default',
}: PhoneInputProps) {
  const auth = variant === 'auth'
  const parsed = parsePhoneValue(value)
  const [selectedDial, setSelectedDial] = useState(parsed.dial)
  const [localNumber, setLocalNumber] = useState(parsed.local)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync when external value changes
  useEffect(() => {
    const p = parsePhoneValue(value)
    setSelectedDial(p.dial)
    setLocalNumber(p.local)
  }, [value])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectedCountry = COUNTRY_CODES.find((c) => c.dial === selectedDial) || COUNTRY_CODES[0]

  const filteredCountries = search
    ? COUNTRY_CODES.filter(
        (c) =>
          plano(c.name).includes(plano(search)) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRY_CODES

  const emitChange = (dial: string, local: string) => {
    const cleaned = local.replace(/[^\d]/g, '')
    onChange(`${dial} ${cleaned}`)
  }

  const inputId = useId()

  const handleDialChange = (country: CountryCode) => {
    setSelectedDial(country.dial)
    setOpen(false)
    setSearch('')
    emitChange(country.dial, localNumber)
    // El buscador desaparece al cerrar: el cursor sigue en el número.
    document.getElementById(inputId)?.focus()
  }

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Se limpia y DESPUÉS se recorta a 10. Con maxLength el navegador cortaba
    // primero y lo pegado quedaba mocho: «300 123 4567» → «30012345».
    const valor = e.target.value
    let raw = valor.replace(/[^\d]/g, '')
    // Formato internacional: «+57 300…» o, con 00 en vez de +, «0057 300…». El 00
    // solo cuenta si sobran dígitos: «001234567» es alguien corrigiendo el primer
    // dígito de «3001234567», no un indicativo.
    const con00 = raw.length > 10 && raw.startsWith('00')
    const internacional = con00 || valor.trim().startsWith('+')
    if (con00) raw = raw.slice(2)
    // Indicativo repetido delante («+57 300 123 4567», «573001234567»): sobra.
    const indicativo = selectedDial.replace(/[^\d]/g, '')
    const traeElSuyo = (internacional || raw.length > 10) && raw.startsWith(indicativo)
    if (traeElSuyo) raw = raw.slice(indicativo.length)
    // Con el indicativo de OTRO país no se recorta a 10: «+1 305 555 1234» quedaba
    // «1305555123», pasaba la validación y salía como «+57 1305555123». Se deja
    // entero (tope de 15) para que lo frene «El celular debe tener 10 dígitos»;
    // y mientras siga pasado de 10, teclear tampoco lo recorta a escondidas.
    const sinRecortar = (internacional && !traeElSuyo) || localNumber.length > 10
    raw = raw.slice(0, sinRecortar ? 15 : 10)
    setLocalNumber(raw)
    emitChange(selectedDial, raw)
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={auth ? 'block text-[13px] font-semibold text-slate-900 mb-1.5' : 'block text-sm font-medium text-gray-700 mb-1'}>
          {label}{required && <span className="text-coral-700"> *</span>}
        </label>
      )}
      <div className="relative flex">
        {/* Country selector button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => { if (!disabled) setOpen(!open) }}
            disabled={disabled}
            className={cn(
              // h-full: en pantallas táctiles el campo del número sube a 16 px de letra
              // (globals.css) y quedaba 3 px más alto que este botón.
              'flex h-full items-center gap-1 px-2.5 py-2.5 border rounded-l-lg text-sm bg-gray-50 hover:bg-gray-100 transition-colors min-w-[90px] justify-center',
              auth && 'rounded-l-[10px] border-[1.5px] bg-white',
              error ? 'border-red-300' : auth ? 'border-slate-200' : 'border-gray-300',
              disabled && 'bg-gray-100 cursor-not-allowed opacity-60'
            )}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-gray-700 font-medium">{selectedCountry.dial}</span>
            <svg className={cn('w-3 h-3 text-gray-500 transition-transform', open && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    // El buscador vive dentro del formulario de la página: sin
                    // esto, Enter enviaba el formulario entero en vez de elegir.
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    // Sin texto no hay nada que elegir: se cierra y queda el país que
                    // estaba (antes Enter ponía el primero de la lista, Colombia).
                    if (!search.trim()) {
                      setOpen(false)
                      setSearch('')
                      document.getElementById(inputId)?.focus()
                    } else if (filteredCountries[0]) handleDialChange(filteredCountries[0])
                  }}
                  placeholder="Buscar país…"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto max-h-48">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleDialChange(country)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-primary-50 transition-colors text-left',
                      country.dial === selectedDial && 'bg-primary-50 text-primary-700 font-medium'
                    )}
                  >
                    <span className="text-base leading-none">{country.flag}</span>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="text-gray-500 text-xs">{country.dial}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500">Sin resultados</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone number input */}
        <div className="relative flex-1">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            value={localNumber}
            onChange={handleLocalChange}
            disabled={disabled}
            placeholder={placeholder || (auth ? 'Número de celular' : '3001234567')}
            className={cn(
              'w-full py-2.5 border rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
              auth && 'rounded-r-[10px] border-[1.5px] py-3 text-[15px] leading-[1.25] placeholder:text-slate-400 focus:ring-[3px] focus:ring-primary-600/10 focus:border-primary-600',
              icon ? 'pl-10 pr-4' : auth ? 'px-3.5' : 'px-3',
              error ? 'border-red-300 bg-red-50' : auth ? 'border-slate-200' : 'border-gray-300',
              'border-l-0',
              disabled && 'bg-gray-100 cursor-not-allowed'
            )}
          />
        </div>
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export { COUNTRY_CODES }
export type { CountryCode }
