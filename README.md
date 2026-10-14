# Cofianza — Frontend web

Frontend de **Cofianza 2.0**, plataforma de afianzamiento de arriendos en Colombia: inmobiliarias y propietarios publican inmuebles, gestionan estudios de los arrendatarios, contratos con firma electrónica y pagos.

Este repo es solo la web. El backend (API REST en Express + Supabase) es un repositorio aparte.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Zustand (estado del cliente)
- TipTap (texto enriquecido) y react-pdf (visor de PDF)

## Correr en local

Requisitos: Node.js 20+ y la API corriendo (por defecto en `http://localhost:4000`).

```bash
npm install
cp .env.example .env.local   # ajuste NEXT_PUBLIC_API_URL y las variables de Supabase
npm run dev                  # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` debe apuntar al prefijo `/api/v1` de la API (ej. `http://localhost:4000/api/v1`).

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3000 (usa `--webpack`, no turbopack) |
| `npm run build` | Build de producción (incluye el chequeo de tipos) |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint (`npm run lint -- --fix` para corregir) |
| `npx tsc --noEmit` | Chequeo de tipos sin compilar |

No hay suite de pruebas en este repo.

## Estructura

```
app/
  (auth)/        login, registro, recuperar contraseña, verificar email
  (dashboard)/   aplicación con sesión (inmuebles, expedientes, contratos, pagos, configuración, admin…)
  (public)/      flujos públicos protegidos por un token en la URL (autorizar, firma, pago, coarrendatario…)
  page.tsx       landing; además /vitrina, /inmueble, /privacidad, /terminos
services/        un <dominio>Service.ts por recurso de la API (HTTP puro sobre lib/api.ts)
stores/          stores de Zustand (caché y estado compartido)
hooks/           hooks use* que combinan services + stores para los componentes
components/      componentes por dominio y components/ui (base)
lib/             cliente HTTP (api.ts), constantes, utilidades
types/           tipos de dominio y RBAC
proxy.ts         middleware de Next (protege las rutas del dashboard)
docs/            arquitectura, convenciones, modelo de datos, roles y permisos
```

Los componentes usan hooks; los hooks usan services y stores. Toda la autorización y el aislamiento entre inmobiliarias los aplica la API; la web solo oculta lo que el usuario no puede usar.

## Despliegue

Vercel, con despliegue automático desde `main` y previews por rama. Las variables de entorno se configuran en Vercel (mismos nombres que `.env.example`).

## Instrucciones para agentes

Ver [AGENTS.md](AGENTS.md) (comandos, arquitectura y convenciones). `CLAUDE.md` solo lo importa.
