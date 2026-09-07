/**
 * Solo el storage de Supabase esta en `images.remotePatterns` (next.config.ts).
 * Cualquier otra URL (logo externo, dato viejo) se pinta sin optimizar en vez
 * de tumbar la pagina con "hostname not configured".
 */
export const esStorageSupabase = (url: string): boolean =>
  /\.supabase\.co\/storage\/v1\/object\/public\//.test(url)
