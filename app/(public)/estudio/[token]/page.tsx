/**
 * Pagina publica de formulario self-service para estudio de riesgo crediticio
 * Accesible sin autenticacion via token unico
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { estudioPublicService } from '@/services/estudioService'
import type { IEstudioPublicForm, ISubmitFormularioInput } from '@/types/estudio'

// ============================================
// Types
// ============================================

type PageState = 'loading' | 'form' | 'submitted' | 'completed' | 'error'

// ============================================
// Page Component
// ============================================

export default function EstudioFormularioPage() {
  const params = useParams()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [formInfo, setFormInfo] = useState<IEstudioPublicForm | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [nombre, setNombre] = useState('')
  const [tipoDoc, setTipoDoc] = useState('CC')
  const [numDoc, setNumDoc] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ingresos, setIngresos] = useState('')
  const [ocupacion, setOcupacion] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [direccion, setDireccion] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Load form info
  useEffect(() => {
    async function load() {
      try {
        const data = await estudioPublicService.getFormulario(token)
        setFormInfo(data)
        setPageState(data.ya_completado ? 'completed' : 'form')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Enlace invalido o expirado'
        setErrorMessage(msg)
        setPageState('error')
      }
    }
    load()
  }, [token])

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!nombre.trim() || !numDoc.trim() || !email.trim() || !telefono.trim()) {
      setFormError('Por favor complete todos los campos obligatorios')
      return
    }

    if (!acepta) {
      setFormError('Debe aceptar los terminos y condiciones')
      return
    }

    setSubmitting(true)
    try {
      const data: ISubmitFormularioInput = {
        nombre_completo: nombre.trim(),
        tipo_documento: tipoDoc,
        numero_documento: numDoc.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        ingresos_mensuales: ingresos ? Number(ingresos) : undefined,
        ocupacion: ocupacion.trim() || undefined,
        empresa: empresa.trim() || undefined,
        direccion_residencia: direccion.trim() || undefined,
        acepta_terminos: true,
      }
      await estudioPublicService.submitFormulario(token, data)
      setPageState('submitted')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el formulario'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================
  // Render states
  // ============================================

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando formulario...</p>
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Enlace no disponible</h2>
        <p className="text-gray-500">{errorMessage}</p>
        <p className="text-sm text-gray-400 mt-4">
          Si necesitas un nuevo enlace, contacta a tu agente inmobiliario.
        </p>
      </div>
    )
  }

  if (pageState === 'submitted') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Formulario enviado</h2>
        <p className="text-gray-500">
          Gracias por completar la informacion. Tu estudio de riesgo crediticio esta siendo procesado.
        </p>
        <p className="text-sm text-gray-400 mt-4">
          Puedes cerrar esta ventana.
        </p>
      </div>
    )
  }

  // ============================================
  // Already completed — read-only summary
  // ============================================

  if (pageState === 'completed' && formInfo) {
    const datos = (formInfo.datos_formulario || {}) as Record<string, string | number | undefined>
    return (
      <div className="space-y-6">
        {/* Info banner */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-primary-900 mb-1">
            Estudio de Riesgo Crediticio
          </h2>
          <p className="text-sm text-primary-700">
            Expediente: <strong>{formInfo.expediente_numero}</strong>
            {formInfo.inmueble_direccion && (
              <> &middot; {formInfo.inmueble_direccion}, {formInfo.inmueble_ciudad}</>
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Formulario completado</h3>
              <p className="text-sm text-gray-500">Tu información fue enviada exitosamente. A continuación un resumen de los datos registrados.</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            {datos.nombre_completo && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Nombre</span>
                <span className="text-sm text-gray-900 col-span-2">{datos.nombre_completo}</span>
              </div>
            )}
            {datos.tipo_documento && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Documento</span>
                <span className="text-sm text-gray-900 col-span-2">{datos.tipo_documento} {datos.numero_documento}</span>
              </div>
            )}
            {datos.email && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm text-gray-900 col-span-2">{datos.email}</span>
              </div>
            )}
            {datos.telefono && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Teléfono</span>
                <span className="text-sm text-gray-900 col-span-2">{datos.telefono}</span>
              </div>
            )}
            {datos.ingresos_mensuales && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Ingresos</span>
                <span className="text-sm text-gray-900 col-span-2">
                  ${Number(datos.ingresos_mensuales).toLocaleString('es-CO')}
                </span>
              </div>
            )}
            {datos.ocupacion && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Ocupación</span>
                <span className="text-sm text-gray-900 col-span-2">{datos.ocupacion}</span>
              </div>
            )}
            {datos.empresa && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Empresa</span>
                <span className="text-sm text-gray-900 col-span-2">{datos.empresa}</span>
              </div>
            )}
            {datos.direccion_residencia && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-gray-500">Dirección</span>
                <span className="text-sm text-gray-900 col-span-2">{datos.direccion_residencia}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 pt-2">
            Tu estudio de riesgo crediticio está siendo procesado. Puedes cerrar esta ventana.
          </p>
        </div>
      </div>
    )
  }

  // ============================================
  // Form
  // ============================================

  return (
    <div className="space-y-6">
      {/* Info banner */}
      {formInfo && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-primary-900 mb-1">
            Estudio de Riesgo Crediticio
          </h2>
          <p className="text-sm text-primary-700">
            Expediente: <strong>{formInfo.expediente_numero}</strong>
            {formInfo.inmueble_direccion && (
              <> &middot; {formInfo.inmueble_direccion}, {formInfo.inmueble_ciudad}</>
            )}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900">Datos personales</h3>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {formError}
          </div>
        )}

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Ingrese su nombre completo"
          />
        </div>

        {/* Tipo y numero de documento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo documento <span className="text-red-500">*</span>
            </label>
            <select
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="CC">Cédula de Ciudadanía</option>
              <option value="CE">Cédula de Extranjería</option>
              <option value="TI">Tarjeta de Identidad</option>
              <option value="NIT">NIT</option>
            </select>
            <p className="text-xs text-amber-700 mt-1">
              Solo aceptamos documentos colombianos. Si eres extranjero residente, usa tu Cédula de Extranjería.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de documento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={numDoc}
              onChange={(e) => setNumDoc(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ingresa tu número de documento"
            />
          </div>
        </div>

        {/* Email y telefono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="3001234567"
            />
          </div>
        </div>

        {/* Ingresos y ocupacion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ingresos mensuales <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="number"
              value={ingresos}
              onChange={(e) => setIngresos(e.target.value)}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="$ 0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ocupación <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={ocupacion}
              onChange={(e) => setOcupacion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Empleado, independiente, etc."
            />
          </div>
        </div>

        {/* Empresa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa donde trabaja <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Nombre de la empresa"
          />
        </div>

        {/* Direccion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección de residencia <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Calle, número, barrio, ciudad"
          />
        </div>

        {/* Terminos del servicio.
            OJO: esta casilla NO es la autorizacion de habeas data. Antes decia
            "Autorizo el tratamiento de mis datos personales para la realizacion
            del estudio de riesgo crediticio", pero esta pantalla no presenta el
            texto de esa autorizacion (ni completo ni tras un enlace), no guarda
            su version, ni deja evidencia en autorizaciones_habeas_data: solo
            escribe acepta_terminos en datos_formulario. El §8.4 exige el texto
            integro VISIBLE y evidencia demostrable, y eso solo ocurre en el
            enlace de autorizacion (/autorizar/:token), que es ademas lo unico
            que el gate acepta para consultar centrales de riesgo. Por eso aqui
            la casilla se limita a lo que de verdad recoge. */}
        <div className="flex items-start gap-3 pt-2">
          <input
            id="acepta_terminos"
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="acepta_terminos" className="text-sm text-gray-600">
            Acepto los términos y condiciones del servicio.
          </label>
        </div>
        <p className="text-xs text-gray-500 -mt-1">
          Enviar este formulario no autoriza la consulta en centrales de riesgo. Esa autorización se
          firma aparte, en el enlace de autorización que te enviamos: allí verás el texto completo
          antes de aceptarlo.
        </p>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Enviando...' : 'Enviar formulario'}
          </button>
        </div>
      </form>
    </div>
  )
}
