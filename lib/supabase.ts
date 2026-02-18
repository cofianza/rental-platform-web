/**
 * Cliente Supabase - HP-95
 * Se usa principalmente para Google OAuth
 * El resto de la autenticación va por el backend
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
    // Persistir sesión solo para que el callback de OAuth funcione
    persistSession: true,
    // No auto-refrescar: nosotros manejamos tokens via nuestro backend
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
})
