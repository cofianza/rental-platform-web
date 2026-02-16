# Habitar Propiedades - Frontend Web

Plataforma de gestión de arrendamientos en Colombia.

## Stack Tecnológico

- **Framework:** Next.js 16.1.6 (App Router)
- **UI Library:** React 19.2.3
- **Estilos:** Tailwind CSS 4
- **Lenguaje:** TypeScript 5

## Desarrollo Local

### Requisitos

- Node.js 20 LTS o superior
- npm

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local con valores reales (URL del backend, etc.)
```

### Comandos

```bash
# Desarrollo (puerto 3000)
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm run start
```

## Estructura del Proyecto

```
rental-platform-web/
├── app/                        # Next.js App Router
│   ├── (auth)/                # Grupo: páginas de autenticación
│   │   ├── layout.tsx         # Layout centrado sin sidebar
│   │   └── login/page.tsx     # Página de login
│   ├── (dashboard)/           # Grupo: páginas del dashboard
│   │   ├── layout.tsx         # Layout con sidebar + header
│   │   ├── dashboard/         # Página principal
│   │   ├── inmuebles/         # Gestión de inmuebles
│   │   ├── expedientes/       # Gestión de expedientes
│   │   ├── usuarios/          # Gestión de usuarios
│   │   ├── reportes/          # Reportes
│   │   └── configuracion/     # Configuración
│   ├── layout.tsx             # Layout raíz
│   ├── page.tsx               # Landing / vitrina pública
│   └── globals.css            # Estilos globales + paleta teal
├── lib/                       # Utilidades y configuraciones
│   ├── constants.ts           # Constantes del dominio
│   ├── mock-data.ts           # Datos mock colombianos
│   ├── api.ts                 # Cliente HTTP para backend
│   └── utils.ts               # Funciones helper
├── types/                     # Tipos TypeScript
└── tailwind.config.ts         # Configuración Tailwind

(Próximamente: components/, hooks/, stores/, schemas/)
```

## Convenciones

### Nomenclatura

- **Componentes:** PascalCase (`PropertyCard.tsx`)
- **Hooks:** camelCase con prefijo `use` (`useAuth.ts`)
- **Utilidades:** camelCase (`formatCurrency.ts`)
- **Tipos/Interfaces:** PascalCase (`IUser`)
- **Constantes:** UPPER_SNAKE_CASE
- **Modelos de negocio:** español (inmueble, expediente, solicitante)
- **Código utilitario:** inglés (isLoading, formatDate)

### Paleta de Colores

La paleta principal es **teal** (tonos 50-950), definida en `tailwind.config.ts`:

- `primary-50` hasta `primary-950`
- Uso: `bg-primary-600`, `text-primary-700`, etc.

### Estados del Sistema

Estados configurados en `lib/constants.ts`:

- **Borrador:** gris
- **En Revisión:** ámbar
- **Información Incompleta:** naranja
- **Aprobado:** verde
- **Rechazado:** rojo
- **Condicionado:** violeta
- **Cerrado:** gris oscuro

### Formato de Moneda

```typescript
import { formatCurrency } from '@/lib/constants'

formatCurrency(1500000) // "$1.500.000"
```

## Integración con Backend

El frontend se comunica con el backend Express vía API REST:

- **URL Base:** `http://localhost:4000/api/v1` (desarrollo)
- **Autenticación:** JWT Bearer token en header `Authorization`
- **Cliente HTTP:** `apiClient` de `@/lib/api`

```typescript
import { apiClient } from '@/lib/api'

// Ejemplo
const response = await apiClient.get('/inmuebles')
```

## Roadmap de Historias

- [x] HP-35: Setup del proyecto frontend (actual)
- [ ] HP-41: Layout principal y navegación
- [ ] HP-51: Componentes UI base
- [ ] Historias de funcionalidades específicas...

## Autor

**INXENIUX** - Equipo de desarrollo
