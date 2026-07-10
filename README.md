# Aprende · Centro de aprendizaje white-label

Plataforma de cursos **rebrandeable** construida con Next.js + Supabase, lista para desplegar en Vercel.
Login con Google, carga de cursos y clases, quizzes con calificación automática, y cuatro roles:
**alumno · profesor · supervisor · admin**. Sin pasarela de pago (fuera de alcance de este proyecto).

## Stack

- **Next.js 16** (App Router, React 19, React Compiler) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + RLS)
- **framer-motion**, **lucide-react**, **react-player**
- Deploy: **Vercel**

## Puesta en marcha

1. **Dependencias**
   ```bash
   npm install
   ```

2. **Supabase** — crea un proyecto nuevo en https://supabase.com y aplica el esquema:
   - Abre el **SQL Editor** y pega el contenido de `supabase/migrations/001_schema.sql`, o usa la CLI:
     ```bash
     supabase link --project-ref <ref> && supabase db push
     ```

3. **Google SSO** — en Supabase → *Authentication → Providers → Google*, activa el proveedor y
   pega el Client ID / Secret (Google Cloud → OAuth). En *Authentication → URL Configuration*:
   - **Site URL**: tu dominio (o `http://localhost:3000` en dev)
   - **Redirect URLs**: `<site>/auth/callback`

4. **Variables de entorno** — copia y completa:
   ```bash
   cp .env.local.example .env.local
   ```

5. **Correr**
   ```bash
   npm run dev
   ```

6. **Deploy en Vercel** — importa el repo, define las mismas variables de entorno y listo.

## White-label (rebrandear)

Toda la identidad visual vive en **`lib/brand.ts`**. Para revender la plataforma con otra marca,
cambia ahí el nombre, tagline, logo y colores — **ningún componente hardcodea colores de marca**
(todos leen variables CSS `--brand-*`).

También puedes overridear por entorno sin tocar código (útil para varios clientes/despliegues):

```bash
NEXT_PUBLIC_BRAND_NAME="Academia XYZ"
NEXT_PUBLIC_BRAND_COLOR_PRIMARY="#2f6bff"
NEXT_PUBLIC_BRAND_COLOR_ACCENT="#22d3ee"
NEXT_PUBLIC_BRAND_LOGO_URL="/logo.svg"
NEXT_PUBLIC_BRAND_MODE="dark"
```

> La paleta por defecto está inspirada en la estética dark-tech de geimser.cl
> (slate profundo + azul eléctrico + cian). Ajusta los hex exactos en `lib/brand.ts`.

## Roles

| Rol         | Alcance |
|-------------|---------|
| **alumno**      | Se inscribe en cursos, ve clases, rinde quizzes, sigue su progreso. |
| **profesor**    | Crea y gestiona **sus** cursos, clases y quizzes; ve sus inscritos. |
| **supervisor**  | Gestiona **su institución** (cohorte): alumnos, cursos y avance, en modo supervisión. |
| **admin**       | Control total: cursos, usuarios, roles e instituciones de toda la plataforma. |

El rol se guarda en `profiles.rol`. La protección de rutas es doble: el `middleware.ts` exige sesión,
y cada página sensible exige el rol con `requireRole()` (fuente de verdad: la tabla `profiles`).

## Modelo de datos (`supabase/migrations/001_schema.sql`)

`instituciones` · `profiles` · `cursos` · `modulos` · `lecciones` · `quizzes` ·
`quiz_preguntas` · `quiz_opciones` · `inscripciones` · `progreso_lecciones` · `quiz_intentos`.

- El trigger `handle_new_user()` crea el perfil al registrarse, poblando nombre y avatar desde el SSO.
- **RLS activado** en todas las tablas, con helpers `current_rol()`, `current_institucion()`, `is_admin()`.
- Los quizzes se **califican en el servidor** (`/api/quiz/grade` con service_role) para no exponer
  las respuestas correctas al cliente.

## Estructura

```
app/
  page.tsx                 landing white-label (redirige a /dashboard si hay sesión)
  login/                   Google SSO
  auth/callback/           intercambio de sesión
  dashboard/               inicio role-aware (alumno/profesor/supervisor/admin)
  explorar/                catálogo de cursos publicados
  cursos/[slug]/           detalle + inscripción + índice de clases
  aprender/[leccionId]/    reproductor de clase / quiz
  mis-cursos/              cursos del alumno
  profesor/ supervisor/ admin/   paneles por rol (guardados)
  api/quiz/grade/          calificación server-side de quizzes
components/                nav, marca, tarjetas, quiz, video, etc.
lib/
  brand.ts                 ⭐ configuración white-label
  auth.ts                  sesión + requireRole
  roles.ts                 etiquetas y home por rol
  supabase/                clients (server/client/admin/middleware) + tipos
supabase/migrations/       esquema SQL + RLS
```

## Pendiente / siguientes iteraciones

Los paneles de **gestión** (crear/editar cursos y clases, editor de quizzes, ABM de usuarios e
instituciones) están como pantallas guardadas con el detalle de lo que viene. El **flujo de alumno**
(explorar → inscribirse → ver clase → rendir quiz) está funcional de punta a punta.

Recomendado antes de producción: restringir en RLS la lectura de `quiz_opciones.es_correcta`
para alumnos (p. ej. con una vista sin esa columna).
