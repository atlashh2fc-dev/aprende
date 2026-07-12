# Aprende · Mapeo funcional — de hoy a plataforma pro

Documento de estado real (basado en el código actual: Next.js 16 + Supabase, auth Google, RLS por rol, multi-institución) y hoja de ruta para alcanzar un nivel "pro / disruptivo".

---

## 1. Lo que YA funciona hoy

Base sólida, en producción sobre `aprende.geimser.cl`:

- **Autenticación y roles.** Login con Google, creación automática de perfil, y 4 roles con permisos reales por RLS: `alumno`, `profesor`, `supervisor`, `admin`.
- **Multi-institución (multi-tenant).** El modelo de datos separa instituciones/cohortes; el supervisor ve solo su institución. Está en el esquema y en las políticas, listo para operar varias organizaciones sobre la misma plataforma.
- **Catálogo y ficha de curso.** Listado de cursos publicados (`/explorar`), página pública de cada curso (`/cursos/[slug]`) e inscripción con un clic.
- **Aprendizaje.** Reproductor de lección (`/aprender/[leccionId]`) con soporte de video, texto y quiz; render de contenido y player propios.
- **Evaluación segura.** Quizzes con calificación **en el servidor** (el alumno nunca recibe qué opción es correcta) y registro de intentos con puntaje y aprobación.
- **Progreso.** Seguimiento por lección y por intento de quiz a nivel de datos.
- **Vistas de alumno.** Dashboard e historial "Mis cursos".
- **Panel admin de cursos.** Crear/editar cursos y gestionar sus lecciones (video/texto/quiz), con estados borrador/publicado/archivado. *(recién agregado)*
- **Identidad white-label.** Marca configurable por variables, tema claro/oscuro, paleta e identidad Geimser aplicadas.

---

## 2. Construido a medias (esquema listo, falta UI)

Tenemos la base de datos y las reglas, pero no la interfaz o la lógica de negocio:

- **Módulos.** Existen en el esquema para agrupar lecciones, pero no hay UI para crearlos ni asignarlos.
- **Constructor de quizzes.** Tablas de preguntas y opciones existen, pero no hay pantalla de autoría para armar las preguntas.
- **Paneles de rol incompletos.** `admin/usuarios`, `admin/instituciones`, `profesor/cursos` y `supervisor` son placeholders ("próximas funcionalidades").
- **Certificación.** No existe emisión de certificados al completar un curso.

---

## 3. Brechas para llegar a nivel PRO

Organizadas por pilar. Cada punto es una decisión de producto, no solo de código.

### Contenido y autoría
- Constructor de quizzes completo (preguntas de opción única/múltiple, banco de preguntas, aleatorización).
- Módulos y ordenamiento drag-and-drop de lecciones.
- Subida de video y archivos propia (hoy el video es solo URL) — Supabase Storage o un proveedor de video (Mux/Cloudflare Stream) para streaming, subtítulos y control de reproducción.
- Editor de contenido enriquecido (markdown/WYSIWYG, imágenes, adjuntos, code blocks).
- Rutas de aprendizaje / prerrequisitos (desbloquear lección B al completar A).

### Experiencia de aprendizaje
- Continuar donde quedé, marcado de completado, barra de avance por curso.
- Notas del alumno, marcadores y velocidad de reproducción.
- Discusiones / Q&A por lección; comentarios.
- Accesibilidad (WCAG), soporte móvil pulido, modo offline/PWA.

### Evaluación y credenciales
- Certificados verificables (PDF + URL pública de verificación).
- Tareas/entregas con revisión del profesor y rúbricas.
- Insignias y microcredenciales.

### Engagement y retención
- Gamificación: puntos, rachas, niveles, ranking por cohorte.
- Notificaciones y recordatorios (email + push): "retoma tu curso", "nuevo contenido".
- Metas de aprendizaje y recordatorios de estudio.

### Analítica y reporting
- Dashboard de profesor: inscritos, avance, aprobación, lecciones con más abandono.
- Dashboard de supervisor/institución: adopción por cohorte, cumplimiento, exportables.
- Analítica de aprendizaje (dónde se traba la gente, tasa de finalización, tiempo por lección).

### Operación, multi-tenant y monetización
- Panel de instituciones y usuarios funcional (invitaciones, alta masiva, asignación de cohortes).
- Branding por institución (logo/colores por tenant, no solo global).
- Pagos y planes (Stripe): cursos pagados, suscripciones, cupones — si aplica al modelo.
- Roles y permisos más finos (co-profesores, revisores).

### Calidad e infraestructura
- Suite de tests (unit + e2e), CI en cada push, entornos de staging.
- Observabilidad (errores, logs, métricas), backups y política de retención.
- Endurecer seguridad (rotar llaves, mover funciones helper a schema privado, auditoría RLS, rate limiting).
- SEO y rendimiento (imágenes optimizadas, caché, Core Web Vitals).

---

## 4. La capa DISRUPTIVA (lo que diferencia de un LMS más)

Aquí es donde deja de ser "otro Moodle/Teachable" y se vuelve una plataforma con criterio:

- **Tutor con IA.** Asistente por curso que responde dudas usando el contenido de las lecciones (RAG sobre el material), explica a distintos niveles y da ejemplos.
- **Rutas adaptativas.** El sistema ajusta qué viene según el desempeño en quizzes (refuerza donde el alumno falla).
- **Generación de contenido asistida.** El profesor sube material y la IA propone lecciones, resúmenes, preguntas de quiz y flashcards.
- **Evaluación abierta con IA.** Corrección y feedback de respuestas de desarrollo, no solo opción múltiple.
- **Práctica activa.** Flashcards con repetición espaciada, simulacros, "explícalo con tus palabras" evaluado por IA.
- **Insights para la institución.** Predicción de deserción y alertas tempranas al supervisor.

---

## 5. Ruta sugerida por fases

**Fase A — Completar el núcleo (semanas 1-3).** Constructor de quizzes, módulos con orden, subida/streaming de video real, panel de profesor con avance de sus cursos. *Deja la plataforma operable de punta a punta por un profesor sin tocar SQL.*

**Fase B — Confianza y operación (semanas 3-6).** Certificados verificables, panel de instituciones/usuarios con invitaciones, dashboard de supervisor, notificaciones por email, tests + CI + staging, endurecimiento de seguridad.

**Fase C — Diferenciación (semanas 6-10+).** Tutor con IA (RAG sobre el contenido), generación asistida de quizzes/resúmenes, rutas adaptativas, gamificación, y analítica predictiva de deserción.

---

*Nota: los tiempos son órdenes de magnitud para un equipo pequeño, no compromisos. Cada fase entrega valor por sí sola.*
