'use client'

import { cn } from '@/lib/utils'
import {
  IconLock,
  IconUsers,
  IconLoader,
  IconBuilding2,
  IconUser,
  IconArrowLeft,
  IconArrowRight,
} from '@/components/icons'
import { buttonClasses } from '@/components/ui/Button'
import { SITUACIONES } from './constantes'
import { unirConY } from './textos'
import type { EstadoSobreUsted } from './useSobreUsted'

/**
 * Paso 2 · Opcional: «Sobre usted» (§8.2 laboral e ingreso, §8.3 solo o
 * acompañado). `admiteSegundoFirmante === false` (I2): no se piden los datos
 * del coarrendatario.
 */
export function PasoSobreUsted({
  estado,
  admiteSegundoFirmante,
  guardandoPerfil,
  onContinuar,
  onSeguirSinDatos,
  onSaltar,
  onVolver,
}: {
  estado: EstadoSobreUsted
  admiteSegundoFirmante: boolean | undefined
  guardandoPerfil: boolean
  onContinuar: () => void
  onSeguirSinDatos: () => void
  onSaltar: () => void
  onVolver: () => void
}) {
  const {
    situacion,
    setSituacion,
    tieneRut,
    setTieneRut,
    dondeLabora,
    setDondeLabora,
    ingreso,
    setIngreso,
    presentacion,
    setPresentacion,
    coaNombre,
    setCoaNombre,
    coaApellido,
    setCoaApellido,
    coaEmail,
    setCoaEmail,
    coaTelefono,
    setCoaTelefono,
    coaEmailError,
    setCoaEmailError,
    coaFaltan,
    setCoaFaltan,
    coaContactoError,
    setCoaContactoError,
  } = estado

  return (
    <div className="space-y-5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coral-700">
        Paso 2 · Opcional
      </span>
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Cuéntenos un poco de usted</h2>
        <p className="mt-1 text-sm text-gray-500">
          Con esto encontramos la mejor opción para su caso. Si prefiere no responder algo, déjelo en
          blanco y siga.
        </p>
      </div>

      {/* §8.2 Situación laboral — selección simple */}
      <div>
        <p className="text-sm font-bold text-gray-900">¿Cuál es su situación hoy?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {SITUACIONES.map((sit) => {
            const on = situacion === sit.key
            return (
              <button
                key={sit.key}
                type="button"
                aria-pressed={on}
                onClick={() => setSituacion(on ? null : sit.key)}
                className={cn(
                  'min-h-11 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                  on
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700',
                )}
              >
                {sit.label}
              </button>
            )
          })}
        </div>
      </div>

      {situacion === 'independiente' && (
        <div>
          <p id="rut-pregunta" className="text-sm font-bold text-gray-900">¿Tiene RUT activo?</p>
          <div role="group" aria-labelledby="rut-pregunta" className="mt-2 grid grid-cols-2 gap-2">
            {([true, false] as const).map((v) => {
              const on = tieneRut === v
              return (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTieneRut(on ? null : v)}
                  className={cn(
                    'min-h-11 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                    on
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700',
                  )}
                >
                  {v ? 'Sí' : 'No'}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* §8.2 Dónde labora */}
      <div>
        <label htmlFor="donde-labora" className="text-sm font-bold text-gray-900">
          {SITUACIONES.find((x) => x.key === situacion)?.pregunta ?? '¿Dónde trabaja?'}
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
          <IconBuilding2 size={16} className="shrink-0 text-gray-500" />
          <input
            id="donde-labora"
            type="text"
            value={dondeLabora}
            maxLength={200}
            onChange={(e) => setDondeLabora(e.target.value)}
            placeholder={SITUACIONES.find((x) => x.key === situacion)?.placeholder || 'Empresa o actividad'}
            className="w-full border-0 bg-transparent py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/*
        §8.2 Ingresos. La redacción es literal del documento ("en lugar de
        'cuánto gana', usar una fórmula como '¿Cuánto recibes al mes,
        aproximadamente?'") y la nota explica para qué se usa.

        La promesa está ACOTADA a propósito: "esta cifra", no "tus
        ingresos". El comprobante de ingresos sigue siendo un documento
        del expediente que la inmobiliaria puede descargar; prometer más
        sería incumplible y verificable.
      */}
      <div>
        <label htmlFor="ingreso" className="text-sm font-bold text-gray-900">
          ¿Cuánto recibe al mes, aproximadamente?
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
          <span className="shrink-0 text-base font-bold text-gray-500">$</span>
          <input
            id="ingreso"
            type="text"
            inputMode="numeric"
            value={ingreso}
            onChange={(e) => {
              // 9 dígitos: por encima el schema (max 1.000.000.000) rechazaría el campo.
              const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
              setIngreso(digits ? Number(digits).toLocaleString('es-CO') : '')
            }}
            placeholder="0"
            className="w-full border-0 bg-transparent py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
          />
        </div>
        <p className="mt-2 flex gap-2 rounded-lg bg-primary-50 p-3 text-xs leading-relaxed text-primary-800">
          <IconLock size={14} className="mt-0.5 shrink-0 text-primary-600" />
          <span>
            Nos ayuda a encontrar la mejor opción para usted. <strong>Esta cifra no se la mostramos a quien
            tramita su arriendo</strong>: la ve solo el equipo de Cofianza.
          </span>
        </p>
      </div>

      {/* §8.3 Solo o acompañado */}
      <div>
        <p className="text-sm font-bold text-gray-900">¿Presenta el estudio solo o acompañado?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            { key: 'solo' as const, Icon: IconUser, label: 'Solo' },
            { key: 'acompanado' as const, Icon: IconUsers, label: 'Con alguien más' },
          ].map((op) => {
            const on = presentacion === op.key
            return (
              <button
                key={op.key}
                type="button"
                aria-pressed={on}
                onClick={() => setPresentacion(on ? null : op.key)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-semibold transition-colors',
                  on
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700',
                )}
              >
                <op.Icon size={20} />
                {op.label}
              </button>
            )
          })}
        </div>

        {/* El mensaje que rompe la objeción más frecuente del mercado (§8.3), con el papel del
            coarrendatario en términos neutrales (D3, 11-nov): con la Adenda 5 cualquiera de los dos
            puede quedar como arrendatario del contrato. La plantilla de WhatsApp no se toca aquí. Sin
            segundo firmante en este estudio (I2) no se habla del coarrendatario ni se piden sus datos. */}
        {admiteSegundoFirmante !== false && (
          <p className="mt-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-xs leading-relaxed text-primary-800">
            Un coarrendatario <strong>no es fiador ni necesita tener finca raíz</strong>: firma el contrato con usted y los dos responden solidariamente por todas las obligaciones del contrato.
          </p>
        )}

        {presentacion === 'acompanado' && admiteSegundoFirmante === false && (
          <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
            Para este inmueble el estudio se hace solo con sus datos: no hace falta que nos deje los de la otra persona.
          </p>
        )}

        {presentacion === 'acompanado' && admiteSegundoFirmante !== false && (
          <div className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            {/* La promesa anterior ("tú no tienes que repetir nada") no
                era verificable: si el estudio queda condicionado, la card
                del coarrendatario sí le pide la cédula. Prometemos solo
                lo que la card cumple. */}
            <p className="text-xs text-gray-500">
              Déjenos los datos de su coarrendatario: nombre, apellido y su correo o su WhatsApp. Cuando
              avancemos con su estudio le pediremos la cédula de esa persona (y su correo, si no lo deja
              aquí): lo demás ya queda guardado.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
              <label htmlFor="coa-nombre" className="sr-only">Nombre de su coarrendatario</label>
              <input
                id="coa-nombre"
                type="text"
                autoComplete="off"
                value={coaNombre}
                maxLength={100}
                onChange={(e) => {
                  setCoaNombre(e.target.value)
                  if (coaFaltan.length) setCoaFaltan([])
                }}
                placeholder="Nombre"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              />
              </div>
              <div>
              <label htmlFor="coa-apellido" className="sr-only">Apellido de su coarrendatario</label>
              <input
                id="coa-apellido"
                type="text"
                autoComplete="off"
                value={coaApellido}
                maxLength={100}
                onChange={(e) => {
                  setCoaApellido(e.target.value)
                  if (coaFaltan.length) setCoaFaltan([])
                }}
                placeholder="Apellido"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              />
              </div>
            </div>
            <label htmlFor="coa-email" className="block text-xs font-medium text-gray-700">Correo de su coarrendatario</label>
            <input
              id="coa-email"
              type="email"
              autoComplete="off"
              aria-invalid={coaEmailError || coaContactoError?.campo === 'email'}
              aria-describedby={coaEmailError || coaContactoError?.campo === 'email' ? 'coa-email-error' : undefined}
              value={coaEmail}
              maxLength={120}
              onChange={(e) => {
                setCoaEmail(e.target.value)
                if (coaEmailError) setCoaEmailError(false)
                if (coaContactoError?.campo === 'email') setCoaContactoError(null)
                if (coaFaltan.length) setCoaFaltan([])
              }}
              placeholder="nombre@correo.com"
              className={cn(
                'w-full rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500',
                coaEmailError || coaContactoError?.campo === 'email' ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {coaEmailError ? (
              <p id="coa-email-error" role="alert" className="text-xs text-red-600">
                Revise este correo: parece incompleto. También puede borrarlo y dejarnos solo su
                WhatsApp.
              </p>
            ) : coaContactoError?.campo === 'email' && (
              <p id="coa-email-error" role="alert" className="text-xs text-red-600">{coaContactoError.mensaje}</p>
            )}
            <label htmlFor="coa-telefono" className="block text-xs font-medium text-gray-700">WhatsApp de su coarrendatario</label>
            <input
              id="coa-telefono"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={coaTelefono}
              maxLength={20}
              aria-invalid={coaContactoError?.campo === 'telefono'}
              aria-describedby={coaContactoError?.campo === 'telefono' ? 'coa-telefono-error' : undefined}
              onChange={(e) => {
                  setCoaTelefono(e.target.value)
                  if (coaContactoError?.campo === 'telefono') setCoaContactoError(null)
                  if (coaFaltan.length) setCoaFaltan([])
                }}
              placeholder="300 123 4567"
              className={cn(
                'w-full rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500',
                coaContactoError?.campo === 'telefono' ? 'border-red-300' : 'border-gray-200',
              )}
            />
            {coaContactoError?.campo === 'telefono' && (
              <p id="coa-telefono-error" role="alert" className="text-xs text-red-600">{coaContactoError.mensaje}</p>
            )}
            {coaFaltan.length > 0 && (
              <div role="alert" className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">
                  Para guardar a su coarrendatario {coaFaltan.length > 1 ? 'faltan' : 'falta'} {unirConY(coaFaltan)}. Complételo o siga sin sus
                  datos; nos los puede dar después.
                </p>
                <button
                  type="button"
                  onClick={() => onSeguirSinDatos()}
                  className="min-h-11 w-full rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Seguir sin sus datos
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nunca deshabilitado: §8.2 es, según el propio documento, donde
          más gente abandona. Todo aquí es opcional.
          Sin pasar el evento: guardarPerfilYSeguir(true) significa «seguir sin
          el coarrendatario» y un evento contaría como true. */}
      <button
        type="button"
        onClick={() => onContinuar()}
        disabled={guardandoPerfil}
        className={buttonClasses('primary', 'lg', 'w-full')}
      >
        {guardandoPerfil ? <IconLoader size={18} className="animate-spin" /> : null}
        Continuar {!guardandoPerfil && <IconArrowRight size={16} />}
      </button>
      {/* M13: salida explícita para quien no quiere contestar nada. No
          guarda lo que haya escrito en este paso, y B5: si escribió algo, lo dice. */}
      <button
        type="button"
        onClick={onSaltar}
        disabled={guardandoPerfil}
        className={buttonClasses('secondary', 'lg', 'w-full')}
      >
        {[situacion, presentacion, dondeLabora.trim(), ingreso, coaNombre.trim(), coaApellido.trim(), coaEmail.trim(), coaTelefono.trim()].some(Boolean)
          ? 'Saltar sin guardar lo que escribió'
          : 'Saltar este paso'}
      </button>
      <button
        type="button"
        onClick={onVolver}
        disabled={guardandoPerfil}
        className="mx-auto inline-flex min-h-11 items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconArrowLeft size={14} /> Volver
      </button>
    </div>
  )
}
