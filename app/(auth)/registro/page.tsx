'use client'

import Link from 'next/link'
import { IconUser, IconBuilding2 } from '@/components/icons'
import { AUTH_ROUTES } from '@/lib/constants'

export default function RegisterTypeSelectorPage() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      {/* Logo mobile */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-700 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">HP</span>
        </div>
        <span className="text-xl font-semibold text-primary-700">
          Cofianza
        </span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Crear cuenta
      </h1>
      <p className="text-gray-500 text-center mb-8">
        Selecciona tu tipo de cuenta
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href={AUTH_ROUTES.REGISTER_PROPIETARIO}
          className="group flex flex-col items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
        >
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <IconUser size={32} className="text-primary-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Soy Propietario
            </h2>
            <p className="text-sm text-gray-500">
              Persona natural que desea administrar sus propiedades
            </p>
          </div>
        </Link>

        <Link
          href={AUTH_ROUTES.REGISTER_INMOBILIARIA}
          className="group flex flex-col items-center gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
        >
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <IconBuilding2 size={32} className="text-primary-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Soy Inmobiliaria
            </h2>
            <p className="text-sm text-gray-500">
              Empresa o agencia inmobiliaria
            </p>
          </div>
        </Link>
      </div>

      <p className="text-center text-sm text-gray-600">
        Ya tienes cuenta?{' '}
        <Link
          href={AUTH_ROUTES.LOGIN}
          className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
        >
          Inicia sesion
        </Link>
      </p>
    </div>
  )
}
