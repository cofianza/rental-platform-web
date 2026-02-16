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
  inmueble_titulo: string
  solicitante_nombre: string
  estado: EstadoExpediente
  fecha_creacion: string
  fecha_actualizacion: string
  responsable: string
}

export interface MockUsuario {
  id: string
  nombres: string
  apellidos: string
  email: string
  rol: string
  activo: boolean
  fecha_registro: string
}

export interface MockKPI {
  label: string
  value: number | string
  change: number
  trend: 'up' | 'down' | 'neutral'
}

// ============================================
// DATOS MOCK - INMUEBLES
// ============================================

export const MOCK_INMUEBLES: MockInmueble[] = [
  {
    id: '1',
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
    fotos: [],
    descripcion: 'Hermoso apartamento con vista panorámica, acabados de lujo y ubicación privilegiada.',
    fecha_creacion: '2026-01-15',
  },
  {
    id: '2',
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
    fotos: [],
    descripcion: 'Casa independiente con jardín, garaje para 3 vehículos y zona social amplia.',
    fecha_creacion: '2026-01-10',
  },
  {
    id: '3',
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
    fotos: [],
    descripcion: 'Apartaestudio cómodo y funcional, ideal para estudiantes o profesionales.',
    fecha_creacion: '2026-01-20',
  },
  {
    id: '4',
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
    fotos: [],
    descripcion: 'Local comercial en zona de alto flujo peatonal, ideal para retail o servicios.',
    fecha_creacion: '2025-12-05',
  },
  {
    id: '5',
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
    fotos: [],
    descripcion: 'Apartamento familiar en conjunto cerrado con parques infantiles y salón social.',
    fecha_creacion: '2026-02-01',
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
]

// ============================================
// DATOS MOCK - EXPEDIENTES
// ============================================

export const MOCK_EXPEDIENTES: MockExpediente[] = [
  {
    id: '1',
    numero_expediente: 'EXP-2026-001',
    inmueble_titulo: 'Apartamento moderno en El Poblado',
    solicitante_nombre: 'Carlos Andrés Gómez Pérez',
    estado: 'en_revision',
    fecha_creacion: '2026-02-10',
    fecha_actualizacion: '2026-02-12',
    responsable: 'Ana María Torres',
  },
  {
    id: '2',
    numero_expediente: 'EXP-2026-002',
    inmueble_titulo: 'Casa campestre en Envigado',
    solicitante_nombre: 'María Fernanda Rodríguez López',
    estado: 'borrador',
    fecha_creacion: '2026-02-11',
    fecha_actualizacion: '2026-02-11',
    responsable: 'Juan Camilo Ruiz',
  },
  {
    id: '3',
    numero_expediente: 'EXP-2026-003',
    inmueble_titulo: 'Apartaestudio en Laureles',
    solicitante_nombre: 'José Luis Martínez Sánchez',
    estado: 'aprobado',
    fecha_creacion: '2026-02-05',
    fecha_actualizacion: '2026-02-09',
    responsable: 'Ana María Torres',
  },
  {
    id: '4',
    numero_expediente: 'EXP-2026-004',
    inmueble_titulo: 'Apartamento en Belén',
    solicitante_nombre: 'Laura Valentina Díaz',
    estado: 'informacion_incompleta',
    fecha_creacion: '2026-02-08',
    fecha_actualizacion: '2026-02-13',
    responsable: 'Juan Camilo Ruiz',
  },
  {
    id: '5',
    numero_expediente: 'EXP-2026-005',
    inmueble_titulo: 'Oficina en El Poblado',
    solicitante_nombre: 'Andrés Felipe Moreno',
    estado: 'condicionado',
    fecha_creacion: '2026-02-06',
    fecha_actualizacion: '2026-02-10',
    responsable: 'Ana María Torres',
  },
  {
    id: '6',
    numero_expediente: 'EXP-2026-006',
    inmueble_titulo: 'Casa en Sabaneta',
    solicitante_nombre: 'Diana Carolina Ospina',
    estado: 'rechazado',
    fecha_creacion: '2026-02-03',
    fecha_actualizacion: '2026-02-07',
    responsable: 'Juan Camilo Ruiz',
  },
]

// ============================================
// DATOS MOCK - USUARIOS
// ============================================

export const MOCK_USUARIOS: MockUsuario[] = [
  {
    id: '1',
    nombres: 'Mario',
    apellidos: 'Vélez Ramírez',
    email: 'mario.velez@habitarpropiedades.com',
    rol: 'Administrador',
    activo: true,
    fecha_registro: '2025-12-01',
  },
  {
    id: '2',
    nombres: 'Ana María',
    apellidos: 'Torres Gómez',
    email: 'ana.torres@habitarpropiedades.com',
    rol: 'Operador/Analista',
    activo: true,
    fecha_registro: '2026-01-10',
  },
  {
    id: '3',
    nombres: 'Juan Camilo',
    apellidos: 'Ruiz Pérez',
    email: 'juan.ruiz@habitarpropiedades.com',
    rol: 'Operador/Analista',
    activo: true,
    fecha_registro: '2026-01-15',
  },
  {
    id: '4',
    nombres: 'Claudia Patricia',
    apellidos: 'Hernández López',
    email: 'claudia.hernandez@habitarpropiedades.com',
    rol: 'Gerencia/Consulta',
    activo: true,
    fecha_registro: '2026-01-20',
  },
]

// ============================================
// DATOS MOCK - KPIs
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
