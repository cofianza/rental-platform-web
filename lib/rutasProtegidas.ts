/**
 * Rutas que el proxy (proxy.ts) protege y rutas de auth. Lógica pura: sin
 * imports de Next para poder probarla con node:test.
 *
 * DASHBOARD_SEGMENTOS debe listar TODOS los segmentos de primer nivel de
 * app/(dashboard). La prueba lib/rutasProtegidas.test.ts lee esa carpeta y
 * falla si aparece uno nuevo sin agregarlo aquí.
 *
 * El proxy solo mira si existe la cookie marcador; no es la barrera de
 * seguridad (la API valida el token en cada petición). Su trabajo es mandar al
 * login a quien abre una pantalla privada sin sesión.
 */

export const DASHBOARD_SEGMENTOS = [
  'admin',
  'bitacora',
  'citas',
  'configuracion',
  'contratos',
  'dashboard',
  'disponibilidad',
  'estudios',
  'expedientes',
  'facturacion',
  'ingresos',
  'inmobiliarias',
  'inmuebles',
  'inquilinos',
  'interesados',
  'moras',
  'notificaciones',
  'plantillas-contrato',
  'propietarios',
  'reportes',
  'soporte',
  'tipos-documento',
  'usuarios',
] as const

/**
 * Segmentos de primer nivel de app/(public): flujos por enlace con token. No se
 * indexan (robots.ts los excluye y su layout pide noindex). La prueba también
 * avisa si aparece uno nuevo sin agregarlo aquí.
 */
export const PUBLICO_SEGMENTOS = [
  'autorizar',
  'cargar-documentos',
  'coarrendatario',
  'estudio',
  'invitacion',
  'invitacion-miembro',
  'pago',
  'verificar',
  'verificar-identidad',
  'visita',
] as const

// Rutas de auth que deben redirigir a dashboard si ya está autenticado.
// OJO: /verificar-email, /recuperar-contrasena y /restablecer-contrasena NO van
// aquí — el enlace del correo debe funcionar SIEMPRE, incluso si el navegador
// ya tiene una sesión activa (otra pestaña, el celular con la sesión abierta, o
// quien quiere cambiar su contraseña temporal). Si estuvieran en esta lista, el
// proxy los mandaría a /dashboard y el token se perdería.
const AUTH_RUTAS = ['/login', '/registro']

/** Primer segmento del path ('/inmuebles/123' → 'inmuebles'). */
function primerSegmento(pathname: string): string {
  return pathname.split('/')[1] ?? ''
}

/**
 * ¿La ruta es del dashboard (requiere sesión)? Compara por segmento completo:
 * '/inmueble/x' (ficha pública) y '/estudio/x' (enlace con token) NO son
 * '/inmuebles' ni '/estudios'.
 */
export function esRutaProtegida(pathname: string): boolean {
  return (DASHBOARD_SEGMENTOS as readonly string[]).includes(primerSegmento(pathname))
}

/** ¿Ruta de auth de la que se saca a quien ya tiene sesión? (/login, /registro y sus subrutas). */
export function esRutaAuth(pathname: string): boolean {
  return AUTH_RUTAS.includes(pathname) || pathname.startsWith('/registro')
}
