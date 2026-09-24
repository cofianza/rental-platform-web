/**
 * Cliente Supabase - HP-95
 * Solo para el Realtime de notificaciones: la autenticación va por el backend
 * (sin Google desde P15), así que este cliente nunca guarda una sesión propia.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. ' +
    'Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sin OAuth no hay sesión que persistir ni que leer de la URL.
    persistSession: false,
    // No auto-refrescar: nosotros manejamos tokens via nuestro backend
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
