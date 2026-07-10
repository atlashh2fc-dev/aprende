-- ════════════════════════════════════════════════════════════
-- Aprende LMS · Esquema inicial
-- Roles: alumno · profesor · supervisor · admin
-- Multi-institución: el supervisor gestiona SU institución (cohorte).
-- Incluye cursos, módulos, lecciones, quizzes, inscripciones y progreso.
-- ════════════════════════════════════════════════════════════

-- ── Enums ───────────────────────────────────────────────────
CREATE TYPE user_role         AS ENUM ('alumno', 'profesor', 'supervisor', 'admin');
CREATE TYPE curso_estado      AS ENUM ('borrador', 'publicado', 'archivado');
CREATE TYPE leccion_tipo      AS ENUM ('video', 'texto', 'quiz');
CREATE TYPE inscripcion_estado AS ENUM ('activa', 'completada', 'cancelada');
CREATE TYPE pregunta_tipo     AS ENUM ('unica', 'multiple');

-- ── Instituciones (tenants / cohortes) ──────────────────────
CREATE TABLE instituciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Perfiles (extiende auth.users) ──────────────────────────
CREATE TABLE profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  nombre         TEXT,
  apellido       TEXT,
  avatar_url     TEXT,
  rol            user_role NOT NULL DEFAULT 'alumno',
  institucion_id UUID REFERENCES instituciones(id) ON DELETE SET NULL,
  bio            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Cursos ──────────────────────────────────────────────────
CREATE TABLE cursos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  titulo            TEXT NOT NULL,
  descripcion_corta TEXT,
  descripcion       TEXT,
  imagen_url        TEXT,
  nivel             TEXT,
  categoria         TEXT,
  duracion_horas    NUMERIC DEFAULT 0,
  estado            curso_estado NOT NULL DEFAULT 'borrador',
  profesor_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  institucion_id    UUID REFERENCES instituciones(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Módulos (agrupación opcional de lecciones) ──────────────
CREATE TABLE modulos (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  titulo   TEXT NOT NULL,
  orden    INT NOT NULL DEFAULT 0
);

-- ── Lecciones / clases ──────────────────────────────────────
CREATE TABLE lecciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id     UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  modulo_id    UUID REFERENCES modulos(id) ON DELETE SET NULL,
  titulo       TEXT NOT NULL,
  tipo         leccion_tipo NOT NULL DEFAULT 'video',
  contenido    TEXT,
  video_url    TEXT,
  duracion_min INT DEFAULT 0,
  orden        INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Quizzes ─────────────────────────────────────────────────
CREATE TABLE quizzes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id      UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  leccion_id    UUID REFERENCES lecciones(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  descripcion   TEXT,
  aprobacion_min INT NOT NULL DEFAULT 60,  -- % mínimo para aprobar
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quiz_preguntas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id   UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  tipo      pregunta_tipo NOT NULL DEFAULT 'unica',
  orden     INT NOT NULL DEFAULT 0
);

CREATE TABLE quiz_opciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID NOT NULL REFERENCES quiz_preguntas(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
  orden       INT NOT NULL DEFAULT 0
);

-- ── Inscripciones ───────────────────────────────────────────
CREATE TABLE inscripciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  curso_id         UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  estado           inscripcion_estado NOT NULL DEFAULT 'activa',
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alumno_id, curso_id)
);

-- ── Progreso por lección ────────────────────────────────────
CREATE TABLE progreso_lecciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leccion_id         UUID NOT NULL REFERENCES lecciones(id) ON DELETE CASCADE,
  curso_id           UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  completada         BOOLEAN NOT NULL DEFAULT FALSE,
  segundos_dedicados INT DEFAULT 0,
  ultima_vista       TIMESTAMPTZ,
  UNIQUE (alumno_id, leccion_id)
);

-- ── Intentos de quiz ────────────────────────────────────────
CREATE TABLE quiz_intentos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id    UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  puntaje    INT NOT NULL DEFAULT 0,   -- porcentaje 0-100
  aprobado   BOOLEAN NOT NULL DEFAULT FALSE,
  respuestas JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cursos_estado      ON cursos(estado);
CREATE INDEX idx_cursos_profesor    ON cursos(profesor_id);
CREATE INDEX idx_lecciones_curso    ON lecciones(curso_id);
CREATE INDEX idx_inscripciones_al   ON inscripciones(alumno_id);
CREATE INDEX idx_progreso_al        ON progreso_lecciones(alumno_id);

-- ════════════════════════════════════════════════════════════
-- Helpers de rol (SECURITY DEFINER) para las políticas RLS
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION current_rol()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_institucion()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT institucion_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(current_rol() = 'admin', FALSE);
$$;

-- ════════════════════════════════════════════════════════════
-- Trigger: crear perfil al registrarse, poblando desde el SSO
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta      JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  full_name TEXT  := NULLIF(TRIM(COALESCE(meta->>'full_name', meta->>'name', '')), '');
BEGIN
  INSERT INTO profiles (id, email, nombre, apellido, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(meta->>'given_name'), ''), NULLIF(split_part(COALESCE(full_name,''),' ',1),'')),
    COALESCE(NULLIF(TRIM(meta->>'family_name'), ''),
             NULLIF(TRIM(SUBSTRING(COALESCE(full_name,'') FROM POSITION(' ' IN COALESCE(full_name,'')||' '))),'')),
    COALESCE(meta->>'avatar_url', meta->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════
ALTER TABLE instituciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_preguntas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_opciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE progreso_lecciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_intentos       ENABLE ROW LEVEL SECURITY;

-- Perfiles: ver el propio; admin ve todo; supervisor ve su institución.
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR is_admin()
  OR (current_rol() = 'supervisor' AND institucion_id = current_institucion())
);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_admin_all ON profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Instituciones: lectura autenticada; escritura admin.
CREATE POLICY inst_select ON instituciones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY inst_admin  ON instituciones FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Cursos: publicados visibles a autenticados; profesor gestiona los suyos;
-- supervisor lee los de su institución; admin todo.
CREATE POLICY cursos_select ON cursos FOR SELECT USING (
  estado = 'publicado'
  OR profesor_id = auth.uid()
  OR is_admin()
  OR (current_rol() = 'supervisor' AND institucion_id = current_institucion())
);
CREATE POLICY cursos_profesor_write ON cursos FOR ALL
  USING (profesor_id = auth.uid() OR is_admin())
  WITH CHECK (profesor_id = auth.uid() OR is_admin());

-- Módulos / lecciones: visibles si el curso es visible; escritura del dueño/admin.
CREATE POLICY lecciones_select ON lecciones FOR SELECT USING (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = lecciones.curso_id
          AND (c.estado = 'publicado' OR c.profesor_id = auth.uid() OR is_admin()
               OR (current_rol() = 'supervisor' AND c.institucion_id = current_institucion())))
);
CREATE POLICY lecciones_write ON lecciones FOR ALL USING (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = lecciones.curso_id AND (c.profesor_id = auth.uid() OR is_admin()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = lecciones.curso_id AND (c.profesor_id = auth.uid() OR is_admin()))
);
CREATE POLICY modulos_select ON modulos FOR SELECT USING (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = modulos.curso_id
          AND (c.estado = 'publicado' OR c.profesor_id = auth.uid() OR is_admin()))
);
CREATE POLICY modulos_write ON modulos FOR ALL USING (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = modulos.curso_id AND (c.profesor_id = auth.uid() OR is_admin()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = modulos.curso_id AND (c.profesor_id = auth.uid() OR is_admin()))
);

-- Quizzes y su contenido: lectura si la lección/curso es visible; escritura dueño/admin.
CREATE POLICY quizzes_select ON quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = quizzes.curso_id
          AND (c.estado = 'publicado' OR c.profesor_id = auth.uid() OR is_admin()))
);
CREATE POLICY quizzes_write ON quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = quizzes.curso_id AND (c.profesor_id = auth.uid() OR is_admin()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM cursos c WHERE c.id = quizzes.curso_id AND (c.profesor_id = auth.uid() OR is_admin()))
);
CREATE POLICY preguntas_select ON quiz_preguntas FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes q JOIN cursos c ON c.id = q.curso_id WHERE q.id = quiz_preguntas.quiz_id
          AND (c.estado = 'publicado' OR c.profesor_id = auth.uid() OR is_admin()))
);
CREATE POLICY preguntas_write ON quiz_preguntas FOR ALL USING (
  EXISTS (SELECT 1 FROM quizzes q JOIN cursos c ON c.id = q.curso_id WHERE q.id = quiz_preguntas.quiz_id
          AND (c.profesor_id = auth.uid() OR is_admin()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM quizzes q JOIN cursos c ON c.id = q.curso_id WHERE q.id = quiz_preguntas.quiz_id
          AND (c.profesor_id = auth.uid() OR is_admin()))
);
-- Opciones: lectura junto con la pregunta. La corrección (es_correcta) NO debe
-- exponerse al alumno en el cliente; se valida en el servidor al calificar.
CREATE POLICY opciones_select ON quiz_opciones FOR SELECT USING (
  EXISTS (SELECT 1 FROM quiz_preguntas p JOIN quizzes q ON q.id = p.quiz_id JOIN cursos c ON c.id = q.curso_id
          WHERE p.id = quiz_opciones.pregunta_id
          AND (c.estado = 'publicado' OR c.profesor_id = auth.uid() OR is_admin()))
);
CREATE POLICY opciones_write ON quiz_opciones FOR ALL USING (
  EXISTS (SELECT 1 FROM quiz_preguntas p JOIN quizzes q ON q.id = p.quiz_id JOIN cursos c ON c.id = q.curso_id
          WHERE p.id = quiz_opciones.pregunta_id AND (c.profesor_id = auth.uid() OR is_admin()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM quiz_preguntas p JOIN quizzes q ON q.id = p.quiz_id JOIN cursos c ON c.id = q.curso_id
          WHERE p.id = quiz_opciones.pregunta_id AND (c.profesor_id = auth.uid() OR is_admin()))
);

-- Inscripciones: el alumno gestiona las suyas; profesor/supervisor/admin leen su alcance.
CREATE POLICY inscripciones_alumno ON inscripciones FOR ALL
  USING (alumno_id = auth.uid())
  WITH CHECK (alumno_id = auth.uid());
CREATE POLICY inscripciones_staff_read ON inscripciones FOR SELECT USING (
  is_admin()
  OR EXISTS (SELECT 1 FROM cursos c WHERE c.id = inscripciones.curso_id AND c.profesor_id = auth.uid())
  OR (current_rol() = 'supervisor'
      AND EXISTS (SELECT 1 FROM cursos c WHERE c.id = inscripciones.curso_id AND c.institucion_id = current_institucion()))
);

-- Progreso: el alumno gestiona el suyo; staff lee su alcance.
CREATE POLICY progreso_alumno ON progreso_lecciones FOR ALL
  USING (alumno_id = auth.uid())
  WITH CHECK (alumno_id = auth.uid());
CREATE POLICY progreso_staff_read ON progreso_lecciones FOR SELECT USING (
  is_admin()
  OR EXISTS (SELECT 1 FROM cursos c WHERE c.id = progreso_lecciones.curso_id AND c.profesor_id = auth.uid())
  OR (current_rol() = 'supervisor'
      AND EXISTS (SELECT 1 FROM cursos c WHERE c.id = progreso_lecciones.curso_id AND c.institucion_id = current_institucion()))
);

-- Intentos de quiz: el alumno gestiona los suyos; staff lee su alcance.
CREATE POLICY intentos_alumno ON quiz_intentos FOR ALL
  USING (alumno_id = auth.uid())
  WITH CHECK (alumno_id = auth.uid());
CREATE POLICY intentos_staff_read ON quiz_intentos FOR SELECT USING (
  is_admin()
  OR EXISTS (SELECT 1 FROM quizzes q JOIN cursos c ON c.id = q.curso_id
             WHERE q.id = quiz_intentos.quiz_id AND c.profesor_id = auth.uid())
);
