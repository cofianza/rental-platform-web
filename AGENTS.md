# AGENTS.md

Instructions for coding agents (Claude Code, Codex, Cursor, etc.) working in this repo.

This is the **web frontend** of Cofianza 2.0, a rental-guarantee platform for Colombia. The REST API (Express 5 + TypeScript + Supabase) lives in a separate repo; this app talks to it only over HTTP at `NEXT_PUBLIC_API_URL` (its `/api/v1` prefix, default `http://localhost:4000/api/v1`).

**This repo is public.** Never commit secrets, real `.env` files, or real personal data (names, cédulas, phones, emails of clients or staff). Use fictitious examples in mocks, placeholders and comments.

## Commands

- `npm run dev` — Next dev server on port 3000 (webpack mode — note the `--webpack` flag in package.json; not turbopack)
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint over the project (no `lint:fix` script — pass `-- --fix`)

There is **no `typecheck` script and no test runner** in the web app. `tsc --noEmit` will run via `next build`'s type-checking; if you need standalone type-checking run `npx tsc --noEmit`.

## Architecture

**Routing.** App Router with three route groups under [app/](app/):
- `(auth)` — login, registro, recuperar/restablecer contraseña, verificar email. Centered layout, no sidebar.
- `(dashboard)` — protected app (dashboard, inmuebles, expedientes, citas, contratos, estudios, facturacion, plantillas-contrato, bitacora, reportes, usuarios, configuracion, admin, etc.). Sidebar + header layout.
- `(public)` — token-gated public flows accessed by external actors (coarrendatario, autorizar, estudio, firma, invitacion, pago, verificar). No login required, secured by signed/opaque URL tokens issued by the API.

Plus top-level public pages: landing [page.tsx](app/page.tsx), `/vitrina`, `/inmueble`, `/privacidad`, `/terminos`.

**Auth model (HP-95: access token in memory).** Email + password only (Google sign-in was removed, P15).
- [proxy.ts](proxy.ts) is the Next.js middleware (exported as `proxy`, not `middleware` — the file's middleware function is named accordingly). It gates the dashboard routes based on the presence of an `hp-session` cookie set by [services/authService.ts](services/authService.ts) after login; that cookie is only a marker, not a credential.
- [providers/AuthProvider.tsx](providers/AuthProvider.tsx) wraps the whole app in [app/layout.tsx](app/layout.tsx). On mount it calls `authService.checkSession()` to repopulate the in-memory access token from the API.
- The access token lives only in memory, in [stores/auth.store.ts](stores/auth.store.ts) (Zustand); [lib/api.ts](lib/api.ts) reads it via `useAuthStore.getState().accessToken` for every request and sends it as `Authorization: Bearer …`. The Supabase refresh token is kept in `localStorage` (key `hp-rt`) and posted to `POST /auth/refresh` by `authService.doRefreshToken`, which stores the rotated one.

**Data layer pattern.** Three coordinated layers per domain — keep the boundaries clean:
1. [services/](services/) — one `<domain>Service.ts` per backend resource. Pure HTTP wrappers built on `apiClient` from [lib/api.ts](lib/api.ts). No UI state, no React.
2. [stores/](stores/) — Zustand stores for client-side cache / cross-component UI state (e.g. [expedientesStore.ts](stores/expedientesStore.ts), [inmuebles.store.ts](stores/inmuebles.store.ts)).
3. [hooks/](hooks/) — `use*` hooks that compose services + stores and expose loading/error state to components (e.g. [useExpedientes.ts](hooks/useExpedientes.ts), [usePermissions.ts](hooks/usePermissions.ts)).

Components import hooks, not services or stores directly, except for trivial reads.

**API client.** [lib/api.ts](lib/api.ts) exports an `apiClient` singleton (`ApiClient` class with `get/post/put/patch/delete`). It:
- Reads the base URL from `API_BASE_URL` in [lib/constants.ts](lib/constants.ts) (sourced from `NEXT_PUBLIC_API_URL`).
- Injects `Authorization: Bearer <token>` from the Zustand auth store when present.
- Always sends `credentials: 'include'` so the `hp-session` refresh cookie travels.
- Throws `ApiClientError` (statusCode, code, details). Backend error envelope is `{ success: false, errorCode, message, details? }` — the client maps this into the error.
- Network failures become `ApiClientError(NETWORK_ERROR, 0)`.

**RBAC.** Roles live in [types/auth.ts](types/auth.ts) (`administrador | operador_analista | gerencia_consulta | propietario | inmobiliaria | solicitante`). Permission map is keyed by `Resource` in [types/permissions.ts](types/permissions.ts). Sidebar items in [lib/constants.ts](lib/constants.ts) (`NAV_ITEMS`) are filtered by both `resource` (RBAC `read` check) **and** an optional `requiredRoles` allowlist — use `requiredRoles` to hide routes from roles that technically have `read` but shouldn't see the link (the inline comments explain the rationale per item; preserve them when editing).

**Theming.** Tailwind v4. Source of truth for tokens is `@theme inline` in [app/globals.css](app/globals.css); [tailwind.config.ts](tailwind.config.ts) is kept in sync for tools that still read it — mirror any color change in both files. Palettes: `primary` (emerald, post-2026 rebrand), `coral` (accent CTAs), `ink` (dark hero). Display font is Outfit (`font-display`); italic accent is Fraunces (`font-script`).

**PDF + rich text.** [react-pdf](https://www.npmjs.com/package/react-pdf) is wired via the webpack alias in [next.config.ts](next.config.ts) (`pdfjs-dist$` → `pdf.min.mjs`, `canvas → false`). Rich-text editing uses TipTap (`@tiptap/react` + starter-kit + extensions).

**Path alias.** `@/*` → repo root (so `@/lib/api`, `@/components/...`, `@/hooks/...`).

## Conventions

- **UI vocabulary (Flujo Módulo Estudios §13):** what the code calls `expediente` is shown to users as **"estudio"** (single term, mandated by Gerencia); the inner bureau step (`estudios` table, "estudio crediticio") is shown as **"evaluación (crediticia)"** so the two never collide in one sentence ("Habilitar evaluación", "Evaluación habilitada"). Identifiers, routes (`/expedientes`), types and API keys keep `expediente`; only user-facing strings changed — API error/notification messages included. Keep new copy consistent with this.
- **Language split:** business-domain identifiers are in Spanish (`inmueble`, `expediente`, `solicitante`, `coarrendatario`, `propietario`, `inmobiliaria`, `arrendador`, `bitacora`, `vitrina`, `moras`); generic utility code is in English (`isLoading`, `formatDate`, `apiClient`). UI copy is Spanish (Colombia — `lang="es-CO"`).
- **Naming:** components PascalCase, hooks `useFoo`, utilities camelCase, types/interfaces PascalCase (interfaces commonly prefixed `I…`, e.g. `IUser`), constants UPPER_SNAKE_CASE.
- **Toasts:** `sonner` (`<Toaster position="top-right" richColors closeButton />` is mounted in the root layout — just `import { toast } from 'sonner'`).
- **State conventions:** use a Zustand store for state that survives navigation or is shared across trees; use local React state otherwise. There is no TanStack Query here despite what the architecture doc may imply — the stores+hooks pattern is what the codebase actually uses.
- **Cookie name:** `hp-session` (legacy prefix from earlier "Habitar Plus" branding — do not rename without coordinating with the API).

---

## Multi-tenant model (`inmobiliaria` = organization)

RBAC `rol` is the coarse access layer; on top of it the API scopes data **by organization**. An `inmobiliaria` is an org with multiple members; `inmuebles` / `expedientes` carry an `inmobiliaria_id`, and a `miembro_responsable_id` can pin a record to one member. A `propietario` is an individual (no org) scoped by `inmuebles.propietario_id`.

- **Org-level role** is `rol_miembro`, distinct from the RBAC `rol` (all members are RBAC `rol='inmobiliaria'`): `owner` (titular — there can be several), `miembro` (reads + writes org data), `solo_lectura` (read-only). `miembros_ven_todo` on the org decides whether non-owner members see the whole portfolio or only what they created / were assigned.
- **All tenant isolation and the `solo_lectura` write-block are enforced by the API.** The web may hide or render controls, but never rely on a client-side gate for isolation or permissions.
- **Web surface:** team management at [app/(dashboard)/configuracion/equipo](app/(dashboard)/configuracion/equipo/page.tsx), platform-admin org management at [app/(dashboard)/admin/inmobiliarias](app/(dashboard)/admin/inmobiliarias/page.tsx), both through [services/miembrosService.ts](services/miembrosService.ts).
