/**
 * Next.js Proxy - Protección de rutas (HP-95)
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
  '/bitacora',
]

// Rutas de auth que deben redirigir a dashboard si ya está autenticado
const authRoutes = ['/login', '/registro', '/recuperar-contrasena', '/restablecer-contrasena', '/verificar-email']

// Cookie de sesión establecida por authService después del login
const SESSION_COOKIE_NAME = 'hp-session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si hay cookie de sesión (establecida por authService.login)
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME)

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
  const isAuthRoute = authRoutes.some((route) => pathname === route) || pathname.startsWith('/registro')

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
