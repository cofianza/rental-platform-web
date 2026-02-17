/**
 * Next.js Middleware - Protección de rutas (HP-95)
 * Redirige usuarios no autenticados a /login
 * Redirige usuarios autenticados fuera de /login
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/inmuebles',
  '/expedientes',
  '/reportes',
  '/usuarios',
  '/configuracion',
]

// Rutas de auth que deben redirigir a dashboard si ya está autenticado
const authRoutes = ['/login', '/registro', '/recuperar-contrasena']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si hay refresh token cookie (indica sesión activa)
  // El nombre de la cookie debe coincidir con lo que setea el backend
  const hasSession = request.cookies.has('refresh_token') ||
                     request.cookies.has('sb-access-token') || // Supabase cookie
                     request.cookies.has('sb-refresh-token')   // Supabase cookie

  // Ruta protegida sin sesión -> redirect a login
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    // Guardar la ruta original para redirigir después del login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Ruta de auth con sesión -> redirect a dashboard
  const isAuthRoute = authRoutes.some((route) => pathname === route)

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * - api (rutas de API)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos públicos
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
