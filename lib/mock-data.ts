/**
 * Datos mock con contexto colombiano
 * Datos placeholder para desarrollo y pruebas
 */

import type { EstadoExpediente, EstadoInmueble } from './constants'

// ============================================
// TIPOS DE DATOS
// ============================================

export interface MockInmueble {
  id: string
  codigo: string
  titulo: string
  tipo: string
  ciudad: string
  barrio: string
  direccion: string
  valor_arriendo: number
  valor_administracion: number
  area_construida: number
  habitaciones: number
  banos: number
  estrato: number
  estado: EstadoInmueble
  propietario_nombre: string
  fotos: string[]
  descripcion: string
  fecha_creacion: string
}

export interface MockSolicitante {
  id: string
  nombres: string
  apellidos: string
  tipo_documento: string
  numero_documento: string
  email: string
  telefono: string
  ciudad: string
  ocupacion: string
  ingresos_mensuales: number
}

export interface MockExpediente {
  id: string
  numero_expediente: string
  inmueble_id: string
  inmueble_titulo: string
  inmueble_direccion: string
  solicitante_id: string
  solicitante_nombre: string
  estado: EstadoExpediente
  fecha_creacion: string
  fecha_actualizacion: string
  responsable: string
  analista_id: string
  analista_nombre: string
}

export interface MockUsuario {
  id: string
  nombres: string
  apellidos: string
  email: string
  rol: 'admin' | 'analista' | 'gerencia' | 'operador' | 'propietario' | 'inmobiliaria'
  rol_label: string
  activo: boolean
  fecha_registro: string
  ultimo_acceso: string
}

export interface MockKPI {
  label: string
  value: number | string
  change: number
  trend: 'up' | 'down' | 'neutral'
}

// Interfaces para Expediente Detalle
export interface MockDocumento {
  id: string
  tipo: string
  nombre: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  fecha: string
}

export interface MockEstudio {
  proveedor: string
  score: number
  score_max: number
  resultado: 'aprobado' | 'rechazado' | 'pendiente'
  observaciones: string
  fecha: string
}

export interface MockFirmante {
  nombre: string
  rol: string
  firmado: boolean
  fecha_firma?: string
}

export interface MockContrato {
  estado: 'borrador' | 'pendiente_firma' | 'firmado'
  firmantes: MockFirmante[]
}

export interface MockPago {
  id: string
  tipo: string
  monto: number
  estado: 'pendiente' | 'completado' | 'rechazado'
  fecha: string
  referencia: string
}

export interface MockComentario {
  id: string
  usuario: string
  texto: string
  fecha: string
}

export interface MockTimelineEvent {
  id: string
  tipo: 'creacion' | 'documento' | 'estudio' | 'aprobacion' | 'contrato' | 'pago' | 'comentario'
  descripcion: string
  usuario: string
  fecha: string
}

// ============================================
// DATOS MOCK - INMUEBLES (10 items)
// ============================================

export const MOCK_INMUEBLES: MockInmueble[] = [
  {
    id: '1',
    codigo: 'INM-001',
    titulo: 'Apartamento moderno en El Poblado',
    tipo: 'Apartamento',
    ciudad: 'Medellín',
    barrio: 'El Poblado',
    direccion: 'Carrera 43A #10-50',
    valor_arriendo: 2500000,
    valor_administracion: 350000,
    area_construida: 85,
    habitaciones: 3,
    banos: 2,
    estrato: 5,
    estado: 'disponible',
    propietario_nombre: 'Roberto Mejía',
    fotos: [],
    descripcion: 'Hermoso apartamento con vista panorámica, acabados de lujo y ubicación privilegiada.',
    fecha_creacion: '2026-01-15',
  },
  {
    id: '2',
    codigo: 'INM-002',
    titulo: 'Casa campestre en Envigado',
    tipo: 'Casa',
    ciudad: 'Envigado',
    barrio: 'Las Antillas',
    direccion: 'Calle 32 Sur #45-12',
    valor_arriendo: 3200000,
    valor_administracion: 0,
    area_construida: 180,
    habitaciones: 4,
    banos: 3,
    estrato: 6,
    estado: 'en_estudio',
    propietario_nombre: 'Patricia Londoño',
    fotos: [],
    descripcion: 'Casa independiente con jardín, garaje para 3 vehículos y zona social amplia.',
    fecha_creacion: '2026-01-10',
  },
  {
    id: '3',
    codigo: 'INM-003',
    titulo: 'Apartaestudio en Laureles',
    tipo: 'Apartamento',
    ciudad: 'Medellín',
    barrio: 'Laureles',
    direccion: 'Circular 1 #70-25',
    valor_arriendo: 1200000,
    valor_administracion: 150000,
    area_construida: 42,
    habitaciones: 1,
    banos: 1,
    estrato: 4,
    estado: 'disponible',
    propietario_nombre: 'Fernando Ríos',
    fotos: [],
    descripcion: 'Apartaestudio cómodo y funcional, ideal para estudiantes o profesionales.',
    fecha_creacion: '2026-01-20',
  },
  {
    id: '4',
    codigo: 'INM-004',
    titulo: 'Local comercial en Sabaneta',
    tipo: 'Local Comercial',
    ciudad: 'Sabaneta',
    barrio: 'Centro',
    direccion: 'Calle 77 Sur #43-10',
    valor_arriendo: 4500000,
    valor_administracion: 500000,
    area_construida: 120,
    habitaciones: 0,
    banos: 2,
    estrato: 4,
    estado: 'arrendado',
    propietario_nombre: 'Inversiones ABC S.A.S.',
    fotos: [],
    descripcion: 'Local comercial en zona de alto flujo peatonal, ideal para retail o servicios.',
    fecha_creacion: '2025-12-05',
  },
  {
    id: '5',
    codigo: 'INM-005',
    titulo: 'Apartamento en Belén',
    tipo: 'Apartamento',
    ciudad: 'Medellín',
    barrio: 'Belén',
    direccion: 'Carrera 76 #30-45',
    valor_arriendo: 1800000,
    valor_administracion: 200000,
    area_construida: 68,
    habitaciones: 3,
    banos: 2,
    estrato: 3,
    estado: 'disponible',
    propietario_nombre: 'Gloria Restrepo',
    fotos: [],
    descripcion: 'Apartamento familiar en conjunto cerrado con parques infantiles y salón social.',
    fecha_creacion: '2026-02-01',
  },
  {
    id: '6',
    codigo: 'INM-006',
    titulo: 'Oficina en el Centro de Bogotá',
    tipo: 'Oficina',
    ciudad: 'Bogotá',
    barrio: 'Centro Internacional',
    direccion: 'Carrera 7 #32-16 Of. 801',
    valor_arriendo: 3500000,
    valor_administracion: 450000,
    area_construida: 95,
    habitaciones: 0,
    banos: 2,
    estrato: 4,
    estado: 'disponible',
    propietario_nombre: 'Grupo Empresarial XYZ',
    fotos: [],
    descripcion: 'Oficina con excelente ubicación, cerca de TransMilenio y zona financiera.',
    fecha_creacion: '2026-01-25',
  },
  {
    id: '7',
    codigo: 'INM-007',
    titulo: 'Casa en Cali Norte',
    tipo: 'Casa',
    ciudad: 'Cali',
    barrio: 'Ciudad Jardín',
    direccion: 'Calle 16 Norte #9-45',
    valor_arriendo: 2800000,
    valor_administracion: 0,
    area_construida: 150,
    habitaciones: 4,
    banos: 3,
    estrato: 5,
    estado: 'en_estudio',
    propietario_nombre: 'Familia Caicedo',
    fotos: [],
    descripcion: 'Casa amplia con piscina, zona verde y vigilancia 24 horas.',
    fecha_creacion: '2026-02-05',
  },
  {
    id: '8',
    codigo: 'INM-008',
    titulo: 'Bodega en Zona Industrial',
    tipo: 'Bodega',
    ciudad: 'Medellín',
    barrio: 'Guayabal',
    direccion: 'Carrera 52 #10-120',
    valor_arriendo: 8500000,
    valor_administracion: 0,
    area_construida: 450,
    habitaciones: 0,
    banos: 2,
    estrato: 3,
    estado: 'disponible',
    propietario_nombre: 'Inmobiliaria del Valle',
    fotos: [],
    descripcion: 'Bodega con altura de 8 metros, portería y fácil acceso vehicular.',
    fecha_creacion: '2026-01-18',
  },
  {
    id: '9',
    codigo: 'INM-009',
    titulo: 'Apartamento en Barranquilla',
    tipo: 'Apartamento',
    ciudad: 'Barranquilla',
    barrio: 'Alto Prado',
    direccion: 'Calle 80 #53-25',
    valor_arriendo: 2200000,
    valor_administracion: 280000,
    area_construida: 78,
    habitaciones: 3,
    banos: 2,
    estrato: 5,
    estado: 'arrendado',
    propietario_nombre: 'Carlos Daza',
    fotos: [],
    descripcion: 'Apartamento con brisa natural, cerca del Country Club y centros comerciales.',
    fecha_creacion: '2025-12-20',
  },
  {
    id: '10',
    codigo: 'INM-010',
    titulo: 'Local en Centro Comercial',
    tipo: 'Local Comercial',
    ciudad: 'Medellín',
    barrio: 'El Poblado',
    direccion: 'CC Oviedo Local 234',
    valor_arriendo: 6500000,
    valor_administracion: 800000,
    area_construida: 65,
    habitaciones: 0,
    banos: 1,
    estrato: 6,
    estado: 'no_disponible',
    propietario_nombre: 'Inversiones Antioqueñas',
    fotos: [],
    descripcion: 'Local en centro comercial de alto tráfico, ideal para franquicias.',
    fecha_creacion: '2025-11-15',
  },
]

// ============================================
// DATOS MOCK - SOLICITANTES
// ============================================

export const MOCK_SOLICITANTES: MockSolicitante[] = [
  {
    id: '1',
    nombres: 'Carlos Andrés',
    apellidos: 'Gómez Pérez',
    tipo_documento: 'CC',
    numero_documento: '1037456789',
    email: 'carlos.gomez@email.com',
    telefono: '3201234567',
    ciudad: 'Medellín',
    ocupacion: 'Ingeniero de Software',
    ingresos_mensuales: 6500000,
  },
  {
    id: '2',
    nombres: 'María Fernanda',
    apellidos: 'Rodríguez López',
    tipo_documento: 'CC',
    numero_documento: '43987654',
    email: 'maria.rodriguez@email.com',
    telefono: '3159876543',
    ciudad: 'Bogotá',
    ocupacion: 'Contadora Pública',
    ingresos_mensuales: 5200000,
  },
  {
    id: '3',
    nombres: 'José Luis',
    apellidos: 'Martínez Sánchez',
    tipo_documento: 'CE',
    numero_documento: '9876543',
    email: 'jose.martinez@email.com',
    telefono: '3007654321',
    ciudad: 'Medellín',
    ocupacion: 'Diseñador Gráfico',
    ingresos_mensuales: 3800000,
  },
  {
    id: '4',
    nombres: 'Laura Valentina',
    apellidos: 'Díaz Henao',
    tipo_documento: 'CC',
    numero_documento: '1128765432',
    email: 'laura.diaz@email.com',
    telefono: '3112345678',
    ciudad: 'Medellín',
    ocupacion: 'Abogada',
    ingresos_mensuales: 7200000,
  },
  {
    id: '5',
    nombres: 'Andrés Felipe',
    apellidos: 'Moreno Castro',
    tipo_documento: 'CC',
    numero_documento: '1045678901',
    email: 'andres.moreno@email.com',
    telefono: '3189012345',
    ciudad: 'Cali',
    ocupacion: 'Médico',
    ingresos_mensuales: 9500000,
  },
]

// ============================================
// DATOS MOCK - EXPEDIENTES (15+ items)
// ============================================

export const MOCK_EXPEDIENTES: MockExpediente[] = [
  // En revisión (12)
  {
    id: '1',
    numero_expediente: 'EXP-2026-0001',
    inmueble_id: '1',
    inmueble_titulo: 'Apartamento moderno en El Poblado',
    inmueble_direccion: 'Carrera 43A #10-50',
    solicitante_id: '1',
    solicitante_nombre: 'Carlos Andrés Gómez Pérez',
    estado: 'en_revision',
    fecha_creacion: '2026-02-10',
    fecha_actualizacion: '2026-02-12',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  {
    id: '2',
    numero_expediente: 'EXP-2026-0002',
    inmueble_id: '2',
    inmueble_titulo: 'Casa campestre en Envigado',
    inmueble_direccion: 'Calle 32 Sur #45-12',
    solicitante_id: '2',
    solicitante_nombre: 'María Fernanda Rodríguez López',
    estado: 'en_revision',
    fecha_creacion: '2026-02-11',
    fecha_actualizacion: '2026-02-14',
    responsable: 'Juan Camilo Ruiz',
    analista_id: '3',
    analista_nombre: 'Juan Camilo Ruiz',
  },
  {
    id: '3',
    numero_expediente: 'EXP-2026-0003',
    inmueble_id: '6',
    inmueble_titulo: 'Oficina en el Centro de Bogotá',
    inmueble_direccion: 'Carrera 7 #32-16 Of. 801',
    solicitante_id: '5',
    solicitante_nombre: 'Andrés Felipe Moreno Castro',
    estado: 'en_revision',
    fecha_creacion: '2026-02-08',
    fecha_actualizacion: '2026-02-15',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  {
    id: '4',
    numero_expediente: 'EXP-2026-0004',
    inmueble_id: '7',
    inmueble_titulo: 'Casa en Cali Norte',
    inmueble_direccion: 'Calle 16 Norte #9-45',
    solicitante_id: '4',
    solicitante_nombre: 'Laura Valentina Díaz Henao',
    estado: 'en_revision',
    fecha_creacion: '2026-02-07',
    fecha_actualizacion: '2026-02-13',
    responsable: 'Juan Camilo Ruiz',
    analista_id: '3',
    analista_nombre: 'Juan Camilo Ruiz',
  },
  // Información incompleta (5)
  {
    id: '5',
    numero_expediente: 'EXP-2026-0005',
    inmueble_id: '3',
    inmueble_titulo: 'Apartaestudio en Laureles',
    inmueble_direccion: 'Circular 1 #70-25',
    solicitante_id: '3',
    solicitante_nombre: 'José Luis Martínez Sánchez',
    estado: 'informacion_incompleta',
    fecha_creacion: '2026-02-05',
    fecha_actualizacion: '2026-02-12',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  {
    id: '6',
    numero_expediente: 'EXP-2026-0006',
    inmueble_id: '5',
    inmueble_titulo: 'Apartamento en Belén',
    inmueble_direccion: 'Carrera 76 #30-45',
    solicitante_id: '1',
    solicitante_nombre: 'Carlos Andrés Gómez Pérez',
    estado: 'informacion_incompleta',
    fecha_creacion: '2026-02-04',
    fecha_actualizacion: '2026-02-10',
    responsable: 'Juan Camilo Ruiz',
    analista_id: '3',
    analista_nombre: 'Juan Camilo Ruiz',
  },
  // Aprobados (20 - mostramos algunos)
  {
    id: '7',
    numero_expediente: 'EXP-2026-0007',
    inmueble_id: '1',
    inmueble_titulo: 'Apartamento moderno en El Poblado',
    inmueble_direccion: 'Carrera 43A #10-50',
    solicitante_id: '4',
    solicitante_nombre: 'Laura Valentina Díaz Henao',
    estado: 'aprobado',
    fecha_creacion: '2026-01-20',
    fecha_actualizacion: '2026-02-01',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  {
    id: '8',
    numero_expediente: 'EXP-2026-0008',
    inmueble_id: '3',
    inmueble_titulo: 'Apartaestudio en Laureles',
    inmueble_direccion: 'Circular 1 #70-25',
    solicitante_id: '2',
    solicitante_nombre: 'María Fernanda Rodríguez López',
    estado: 'aprobado',
    fecha_creacion: '2026-01-18',
    fecha_actualizacion: '2026-01-28',
    responsable: 'Juan Camilo Ruiz',
    analista_id: '3',
    analista_nombre: 'Juan Camilo Ruiz',
  },
  {
    id: '9',
    numero_expediente: 'EXP-2026-0009',
    inmueble_id: '5',
    inmueble_titulo: 'Apartamento en Belén',
    inmueble_direccion: 'Carrera 76 #30-45',
    solicitante_id: '5',
    solicitante_nombre: 'Andrés Felipe Moreno Castro',
    estado: 'aprobado',
    fecha_creacion: '2026-01-15',
    fecha_actualizacion: '2026-01-25',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  // Rechazados (3)
  {
    id: '10',
    numero_expediente: 'EXP-2026-0010',
    inmueble_id: '2',
    inmueble_titulo: 'Casa campestre en Envigado',
    inmueble_direccion: 'Calle 32 Sur #45-12',
    solicitante_id: '3',
    solicitante_nombre: 'José Luis Martínez Sánchez',
    estado: 'rechazado',
    fecha_creacion: '2026-01-10',
    fecha_actualizacion: '2026-01-20',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  {
    id: '11',
    numero_expediente: 'EXP-2026-0011',
    inmueble_id: '8',
    inmueble_titulo: 'Bodega en Zona Industrial',
    inmueble_direccion: 'Carrera 52 #10-120',
    solicitante_id: '1',
    solicitante_nombre: 'Carlos Andrés Gómez Pérez',
    estado: 'rechazado',
    fecha_creacion: '2026-01-08',
    fecha_actualizacion: '2026-01-18',
    responsable: 'Juan Camilo Ruiz',
    analista_id: '3',
    analista_nombre: 'Juan Camilo Ruiz',
  },
  // Cerrados (5)
  {
    id: '12',
    numero_expediente: 'EXP-2025-0045',
    inmueble_id: '4',
    inmueble_titulo: 'Local comercial en Sabaneta',
    inmueble_direccion: 'Calle 77 Sur #43-10',
    solicitante_id: '4',
    solicitante_nombre: 'Laura Valentina Díaz Henao',
    estado: 'cerrado',
    fecha_creacion: '2025-11-15',
    fecha_actualizacion: '2025-12-20',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  {
    id: '13',
    numero_expediente: 'EXP-2025-0046',
    inmueble_id: '9',
    inmueble_titulo: 'Apartamento en Barranquilla',
    inmueble_direccion: 'Calle 80 #53-25',
    solicitante_id: '2',
    solicitante_nombre: 'María Fernanda Rodríguez López',
    estado: 'cerrado',
    fecha_creacion: '2025-11-10',
    fecha_actualizacion: '2025-12-15',
    responsable: 'Juan Camilo Ruiz',
    analista_id: '3',
    analista_nombre: 'Juan Camilo Ruiz',
  },
  // Condicionado
  {
    id: '14',
    numero_expediente: 'EXP-2026-0012',
    inmueble_id: '6',
    inmueble_titulo: 'Oficina en el Centro de Bogotá',
    inmueble_direccion: 'Carrera 7 #32-16 Of. 801',
    solicitante_id: '1',
    solicitante_nombre: 'Carlos Andrés Gómez Pérez',
    estado: 'condicionado',
    fecha_creacion: '2026-02-01',
    fecha_actualizacion: '2026-02-10',
    responsable: 'Ana María Torres',
    analista_id: '2',
    analista_nombre: 'Ana María Torres',
  },
  // Borrador
  {
    id: '15',
    numero_expediente: 'EXP-2026-0013',
    inmueble_id: '8',
    inmueble_titulo: 'Bodega en Zona Industrial',
    inmueble_direccion: 'Carrera 52 #10-120',
    solicitante_id: '5',
    solicitante_nombre: 'Andrés Felipe Moreno Castro',
    estado: 'borrador',
    fecha_creacion: '2026-02-15',
    fecha_actualizacion: '2026-02-15',
    responsable: 'Juan Camilo Ruiz',
    analista_id: '3',
    analista_nombre: 'Juan Camilo Ruiz',
  },
]

// ============================================
// DATOS MOCK - USUARIOS (8 items)
// ============================================

export const MOCK_USUARIOS: MockUsuario[] = [
  {
    id: '1',
    nombres: 'Mario',
    apellidos: 'Vélez Ramírez',
    email: 'mario.velez@cofianza.com',
    rol: 'admin',
    rol_label: 'Administrador',
    activo: true,
    fecha_registro: '2025-12-01',
    ultimo_acceso: '2026-02-17 08:30',
  },
  {
    id: '2',
    nombres: 'Ana María',
    apellidos: 'Torres Gómez',
    email: 'ana.torres@cofianza.com',
    rol: 'analista',
    rol_label: 'Analista',
    activo: true,
    fecha_registro: '2026-01-10',
    ultimo_acceso: '2026-02-17 09:15',
  },
  {
    id: '3',
    nombres: 'Juan Camilo',
    apellidos: 'Ruiz Pérez',
    email: 'juan.ruiz@cofianza.com',
    rol: 'analista',
    rol_label: 'Analista',
    activo: true,
    fecha_registro: '2026-01-15',
    ultimo_acceso: '2026-02-16 17:45',
  },
  {
    id: '4',
    nombres: 'Claudia Patricia',
    apellidos: 'Hernández López',
    email: 'claudia.hernandez@cofianza.com',
    rol: 'gerencia',
    rol_label: 'Gerencia',
    activo: true,
    fecha_registro: '2026-01-20',
    ultimo_acceso: '2026-02-17 07:00',
  },
  {
    id: '5',
    nombres: 'Diego Fernando',
    apellidos: 'Cardona Mejía',
    email: 'diego.cardona@cofianza.com',
    rol: 'operador',
    rol_label: 'Operador',
    activo: true,
    fecha_registro: '2026-01-25',
    ultimo_acceso: '2026-02-15 14:20',
  },
  {
    id: '6',
    nombres: 'Roberto',
    apellidos: 'Mejía Serna',
    email: 'roberto.mejia@email.com',
    rol: 'propietario',
    rol_label: 'Propietario',
    activo: true,
    fecha_registro: '2026-01-05',
    ultimo_acceso: '2026-02-10 10:00',
  },
  {
    id: '7',
    nombres: 'Patricia',
    apellidos: 'Londoño Vélez',
    email: 'patricia.londono@email.com',
    rol: 'propietario',
    rol_label: 'Propietario',
    activo: false,
    fecha_registro: '2025-12-15',
    ultimo_acceso: '2026-01-20 11:30',
  },
  {
    id: '8',
    nombres: 'Inmobiliaria',
    apellidos: 'Valle del Aburrá',
    email: 'contacto@inmovalleaburra.com',
    rol: 'inmobiliaria',
    rol_label: 'Inmobiliaria',
    activo: true,
    fecha_registro: '2025-11-20',
    ultimo_acceso: '2026-02-14 16:00',
  },
]

// ============================================
// DATOS MOCK - KPIs DASHBOARD
// ============================================

export const MOCK_DASHBOARD_KPIS: MockKPI[] = [
  {
    label: 'Total expedientes',
    value: 145,
    change: 12,
    trend: 'up',
  },
  {
    label: 'Aprobados del mes',
    value: 28,
    change: 8,
    trend: 'up',
  },
  {
    label: 'Pendientes de revisión',
    value: 12,
    change: 0,
    trend: 'neutral',
  },
  {
    label: 'Ingresos del mes',
    value: '$45.600.000',
    change: 15,
    trend: 'up',
  },
]

// ============================================
// DATOS MOCK - EXPEDIENTE DETALLE
// ============================================

export const MOCK_DOCUMENTOS: MockDocumento[] = [
  {
    id: '1',
    tipo: 'Cédula de ciudadanía',
    nombre: 'cedula_carlos_gomez.pdf',
    estado: 'aprobado',
    fecha: '2026-02-10',
  },
  {
    id: '2',
    tipo: 'Certificado laboral',
    nombre: 'certificado_laboral.pdf',
    estado: 'aprobado',
    fecha: '2026-02-10',
  },
  {
    id: '3',
    tipo: 'Desprendibles de nómina',
    nombre: 'nomina_enero_2026.pdf',
    estado: 'aprobado',
    fecha: '2026-02-11',
  },
  {
    id: '4',
    tipo: 'Extractos bancarios',
    nombre: 'extracto_bancolombia.pdf',
    estado: 'pendiente',
    fecha: '2026-02-12',
  },
  {
    id: '5',
    tipo: 'Declaración de renta',
    nombre: 'declaracion_renta_2025.pdf',
    estado: 'rechazado',
    fecha: '2026-02-11',
  },
  {
    id: '6',
    tipo: 'Referencias personales',
    nombre: 'referencias.pdf',
    estado: 'pendiente',
    fecha: '2026-02-12',
  },
]

export const MOCK_ESTUDIO: MockEstudio = {
  proveedor: 'TransUnion Colombia',
  score: 750,
  score_max: 900,
  resultado: 'aprobado',
  observaciones: 'El solicitante presenta un historial crediticio favorable con un score de 750/900. No registra reportes negativos en centrales de riesgo. Capacidad de pago verificada.',
  fecha: '2026-02-13',
}

export const MOCK_CONTRATO: MockContrato = {
  estado: 'pendiente_firma',
  firmantes: [
    {
      nombre: 'Carlos Andrés Gómez Pérez',
      rol: 'Arrendatario',
      firmado: true,
      fecha_firma: '2026-02-14 10:30',
    },
    {
      nombre: 'Roberto Mejía Serna',
      rol: 'Propietario',
      firmado: false,
    },
    {
      nombre: 'Cofianza S.A.S.',
      rol: 'Inmobiliaria',
      firmado: false,
    },
  ],
}

export const MOCK_PAGOS: MockPago[] = [
  {
    id: '1',
    tipo: 'Depósito de garantía',
    monto: 2500000,
    estado: 'completado',
    fecha: '2026-02-14',
    referencia: 'PAY-2026-001',
  },
  {
    id: '2',
    tipo: 'Primer canon',
    monto: 2500000,
    estado: 'completado',
    fecha: '2026-02-14',
    referencia: 'PAY-2026-002',
  },
  {
    id: '3',
    tipo: 'Administración',
    monto: 350000,
    estado: 'pendiente',
    fecha: '2026-02-15',
    referencia: 'PAY-2026-003',
  },
  {
    id: '4',
    tipo: 'Estudio de crédito',
    monto: 80000,
    estado: 'completado',
    fecha: '2026-02-10',
    referencia: 'PAY-2026-004',
  },
  {
    id: '5',
    tipo: 'Comisión inmobiliaria',
    monto: 2500000,
    estado: 'pendiente',
    fecha: '2026-02-20',
    referencia: 'PAY-2026-005',
  },
]

export const MOCK_COMENTARIOS: MockComentario[] = [
  {
    id: '1',
    usuario: 'Ana María Torres',
    texto: 'Documentos recibidos correctamente. Procedemos con la verificación de referencias laborales.',
    fecha: '2026-02-11 14:30',
  },
  {
    id: '2',
    usuario: 'Juan Camilo Ruiz',
    texto: 'Referencias laborales verificadas. El empleador confirma la información proporcionada.',
    fecha: '2026-02-12 09:15',
  },
  {
    id: '3',
    usuario: 'Ana María Torres',
    texto: 'Estudio de crédito aprobado. Se procede a generar el contrato de arrendamiento.',
    fecha: '2026-02-13 16:45',
  },
]

export const MOCK_TIMELINE: MockTimelineEvent[] = [
  {
    id: '1',
    tipo: 'creacion',
    descripcion: 'Expediente creado',
    usuario: 'Carlos Andrés Gómez',
    fecha: '2026-02-10 08:00',
  },
  {
    id: '2',
    tipo: 'documento',
    descripcion: 'Documentos cargados (5 archivos)',
    usuario: 'Carlos Andrés Gómez',
    fecha: '2026-02-10 10:30',
  },
  {
    id: '3',
    tipo: 'estudio',
    descripcion: 'Estudio de crédito iniciado',
    usuario: 'Ana María Torres',
    fecha: '2026-02-11 09:00',
  },
  {
    id: '4',
    tipo: 'aprobacion',
    descripcion: 'Estudio de crédito aprobado (Score: 750)',
    usuario: 'Sistema',
    fecha: '2026-02-13 11:00',
  },
  {
    id: '5',
    tipo: 'contrato',
    descripcion: 'Contrato generado y enviado para firma',
    usuario: 'Ana María Torres',
    fecha: '2026-02-13 17:00',
  },
  {
    id: '6',
    tipo: 'contrato',
    descripcion: 'Contrato firmado por arrendatario',
    usuario: 'Carlos Andrés Gómez',
    fecha: '2026-02-14 10:30',
  },
  {
    id: '7',
    tipo: 'pago',
    descripcion: 'Pago recibido: Depósito de garantía ($2.500.000)',
    usuario: 'Sistema',
    fecha: '2026-02-14 14:00',
  },
]

// ============================================
// DATOS MOCK - KPIs (Legacy)
// ============================================

export const MOCK_KPIS: MockKPI[] = [
  {
    label: 'Inmuebles Disponibles',
    value: 24,
    change: 8.2,
    trend: 'up',
  },
  {
    label: 'Expedientes Activos',
    value: 18,
    change: 12.5,
    trend: 'up',
  },
  {
    label: 'Expedientes Aprobados',
    value: 6,
    change: -3.1,
    trend: 'down',
  },
  {
    label: 'Contratos Firmados',
    value: 4,
    change: 0,
    trend: 'neutral',
  },
  {
    label: 'Valor Total en Gestión',
    value: '$48.500.000',
    change: 15.3,
    trend: 'up',
  },
  {
    label: 'Tasa de Aprobación',
    value: '78%',
    change: 5.2,
    trend: 'up',
  },
]

// ============================================
// HELPER: Calcular días en proceso
// ============================================

export function calcularDiasEnProceso(fechaCreacion: string): number {
  const fecha = new Date(fechaCreacion)
  const hoy = new Date()
  const diffTime = Math.abs(hoy.getTime() - fecha.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// ============================================
// HELPER: Contadores por estado
// ============================================

export function getExpedienteCountByEstado(): Record<string, number> {
  const counts: Record<string, number> = {
    todos: MOCK_EXPEDIENTES.length,
    en_revision: 0,
    informacion_incompleta: 0,
    aprobado: 0,
    rechazado: 0,
    cerrado: 0,
    condicionado: 0,
    borrador: 0,
  }

  MOCK_EXPEDIENTES.forEach(exp => {
    if (counts[exp.estado] !== undefined) {
      counts[exp.estado]++
    }
  })

  return counts
}
