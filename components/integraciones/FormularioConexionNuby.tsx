/**
 * Integración nuby: formulario para conectar (o cambiar las credenciales).
 * La clave secreta vive solo en el estado de este formulario: la web no la
 * guarda (ni en localStorage ni en un store) y la borra apenas la conexión
 * queda hecha. Los campos le piden al navegador y a los gestores de
 * contraseñas que no los traten como el acceso a Cofianza (`new-password`,
 * `data-1p-ignore`, `data-lpignore`); que aun así ofrezcan guardarla depende
 * de cada uno.
 */

'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { IconAlertTriangle, IconEye, IconEyeOff, IconLoader } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  limpiarInstanciaNuby,
  prepararCredencialesNuby,
  validarCredencialesNuby,
  type ErroresCredencialesNuby,
} from '@/lib/integracionNuby'
import type { ResultadoNuby } from '@/hooks/useIntegracionNuby'
import type { CredencialesNuby } from '@/types/integracionNuby'

interface Props {
  /** El administrador de plataforma conecta el nuby de una inmobiliaria, no el suyo. */
  esAdmin: boolean
  /** Dirección ya conectada: el formulario se abrió con «Cambiar credenciales». */
  instanciaActual?: string
  enviando: boolean
  onConectar: (credenciales: CredencialesNuby) => Promise<ResultadoNuby>
  onCancelar?: () => void
}

const CAMPO =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm'

export function FormularioConexionNuby({ esAdmin, instanciaActual, enviando, onConectar, onCancelar }: Props) {
  const cambiando = !!instanciaActual
  const [instancia, setInstancia] = useState(instanciaActual ?? '')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [errores, setErrores] = useState<ErroresCredencialesNuby>({})
  // Lo que respondió la API al probar la conexión (ya viene listo para mostrar).
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const id = useId()
  const instanciaRef = useRef<HTMLInputElement>(null)
  const clientIdRef = useRef<HTMLInputElement>(null)
  const clientSecretRef = useRef<HTMLInputElement>(null)

  const deQuien = esAdmin ? 'del nuby de la inmobiliaria' : 'de su nuby'

  // Cambiar de dirección es cambiar de nuby: se avisa antes de guardar.
  const direccionEscrita = limpiarInstanciaNuby(instancia)
  const cambiaDeNuby = cambiando && direccionEscrita !== '' && direccionEscrita !== limpiarInstanciaNuby(instanciaActual ?? '')

  // Cuando la API rechaza la dirección, el formulario sigue deshabilitado hasta
  // el siguiente render y un campo deshabilitado no recibe el foco: se enfoca
  // apenas vuelve a estar habilitado.
  const enfocarInstancia = useRef(false)
  useEffect(() => {
    if (enviando || !enfocarInstancia.current) return
    enfocarInstancia.current = false
    instanciaRef.current?.focus()
  }, [enviando, errores.instancia])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    const credenciales = prepararCredencialesNuby({ instancia, client_id: clientId, client_secret: clientSecret })
    // Se muestra la dirección ya limpia: es la que se envía.
    setInstancia(credenciales.instancia)
    const faltas = validarCredencialesNuby(credenciales)
    setErrores(faltas)
    setErrorApi(null)
    // El foco va al primer campo por corregir.
    const porCorregir = faltas.instancia ? instanciaRef : faltas.client_id ? clientIdRef : faltas.client_secret ? clientSecretRef : null
    if (porCorregir) {
      porCorregir.current?.focus()
      return
    }

    const r = await onConectar(credenciales)
    if (r.ok) {
      setClientId('')
      setClientSecret('')
      setVerClave(false)
      return
    }
    // Si falló se conserva lo escrito: nuby muestra la clave una sola vez.
    if (r.code === 'NUBY_INSTANCIA_INVALIDA') {
      enfocarInstancia.current = true
      setErrores({ instancia: r.mensaje })
    } else {
      setErrorApi(r.mensaje)
    }
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4 sm:p-6">
        <h2 id={`${id}-titulo`} className="text-base font-semibold text-gray-900">
          {cambiando ? 'Cambiar credenciales' : esAdmin ? 'Conectar el nuby de esta inmobiliaria' : 'Conecte su nuby'}
        </h2>
        {cambiando ? (
          <p className="mt-1 text-sm text-gray-600">
            Cree un cliente nuevo en nuby (Configuraciones → API nuby → «Crear Cliente», con permiso de lectura) y
            registre aquí sus datos. Las credenciales actuales solo se reemplazan si las nuevas pasan la prueba.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600">
              Cofianza copia los inmuebles que {esAdmin ? 'la inmobiliaria' : 'usted'} tiene disponibles para arrendar
              en nuby (estado «Activa»). Se conecta una sola vez, en tres pasos:
            </p>
            <ol className="mt-4 space-y-3">
              <Paso numero={1} titulo="Cree el cliente en nuby">
                En nuby, vaya a Configuraciones → API nuby → «Crear Cliente» y dele solo el permiso de lectura (
                <span className="font-mono text-[13px]">read</span>).
              </Paso>
              <Paso numero={2} titulo="Pegue los datos aquí">
                La dirección {deQuien}, el ID de cliente y la clave secreta. nuby muestra la clave una sola vez:
                cópiela en ese momento.
              </Paso>
              <Paso numero={3} titulo="Pruebe y conecte">
                Cofianza prueba la conexión antes de guardar. Si algo no coincide, se lo decimos aquí mismo.
              </Paso>
            </ol>
          </>
        )}
      </div>

      <form onSubmit={enviar} noValidate className="p-4 sm:p-6">
        <fieldset disabled={enviando} className="m-0 min-w-0 space-y-4 border-0 p-0">
          <legend className="sr-only">Datos del cliente de nuby</legend>

          <div>
            <label htmlFor={`${id}-instancia`} className="mb-1 block text-sm font-medium text-gray-700">
              Dirección {deQuien}
            </label>
            <input
              ref={instanciaRef}
              id={`${id}-instancia`}
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              placeholder="mi-inmobiliaria.nuby.app"
              value={instancia}
              onChange={(e) => {
                setInstancia(e.target.value)
                if (errores.instancia) setErrores((x) => ({ ...x, instancia: undefined }))
              }}
              onBlur={() => setInstancia((v) => limpiarInstanciaNuby(v))}
              aria-invalid={!!errores.instancia}
              aria-describedby={errores.instancia ? `${id}-instancia-ayuda ${id}-instancia-error` : `${id}-instancia-ayuda`}
              className={cn(CAMPO, errores.instancia ? 'border-red-500' : 'border-gray-300')}
            />
            <p id={`${id}-instancia-ayuda`} className="mt-1 text-xs text-gray-500">
              La dirección con la que se entra a nuby. Puede pegarla completa, con https://.
            </p>
            {errores.instancia && (
              <p id={`${id}-instancia-error`} role="alert" className="mt-1 text-sm text-red-700">
                {errores.instancia}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-client-id`} className="mb-1 block text-sm font-medium text-gray-700">
              ID de cliente
            </label>
            <input
              ref={clientIdRef}
              id={`${id}-client-id`}
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              required
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                if (errores.client_id) setErrores((x) => ({ ...x, client_id: undefined }))
              }}
              aria-invalid={!!errores.client_id}
              aria-describedby={errores.client_id ? `${id}-client-id-error` : undefined}
              className={cn(CAMPO, 'font-mono', errores.client_id ? 'border-red-500' : 'border-gray-300')}
            />
            {errores.client_id && (
              <p id={`${id}-client-id-error`} role="alert" className="mt-1 text-sm text-red-700">
                {errores.client_id}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-client-secret`} className="mb-1 block text-sm font-medium text-gray-700">
              Clave secreta
            </label>
            <div className="relative">
              <input
                ref={clientSecretRef}
                id={`${id}-client-secret`}
                type={verClave ? 'text' : 'password'}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                required
                value={clientSecret}
                onChange={(e) => {
                  setClientSecret(e.target.value)
                  if (errores.client_secret) setErrores((x) => ({ ...x, client_secret: undefined }))
                }}
                aria-invalid={!!errores.client_secret}
                aria-describedby={
                  errores.client_secret ? `${id}-client-secret-ayuda ${id}-client-secret-error` : `${id}-client-secret-ayuda`
                }
                className={cn(CAMPO, 'pr-12 font-mono', errores.client_secret ? 'border-red-500' : 'border-gray-300')}
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? 'Ocultar la clave secreta' : 'Mostrar la clave secreta'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed"
              >
                {verClave ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            <p id={`${id}-client-secret-ayuda`} className="mt-1 text-xs text-gray-500">
              nuby la muestra una sola vez, al crear el cliente.
            </p>
            {errores.client_secret && (
              <p id={`${id}-client-secret-error`} role="alert" className="mt-1 text-sm text-red-700">
                {errores.client_secret}
              </p>
            )}
          </div>

          {cambiaDeNuby && (
            <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="min-w-0 text-sm text-amber-800">
                Esta dirección es distinta de la que está conectada. Al guardar, Cofianza olvida los vínculos con el
                nuby anterior: los inmuebles ya copiados se quedan en Cofianza, pero solo seguirán actualizándose los
                que tengan el mismo código en el nuevo nuby.
              </p>
            </div>
          )}

          {errorApi && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <p className="min-w-0 break-words text-sm text-red-800">{errorApi}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
            <Button type="submit" aria-busy={enviando || undefined} className="min-h-11 w-full sm:min-h-10 sm:w-auto">
              {enviando && <IconLoader size={16} className="animate-spin" />}
              {enviando ? 'Probando la conexión…' : 'Probar y conectar'}
            </Button>
            {onCancelar && (
              <Button variante="secondary" onClick={onCancelar} className="min-h-11 w-full sm:min-h-10 sm:w-auto">
                Cancelar
              </Button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  )
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700"
      >
        {numero}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-gray-900">{titulo}</p>
        <p className="mt-0.5 text-gray-600">{children}</p>
      </div>
    </li>
  )
}
