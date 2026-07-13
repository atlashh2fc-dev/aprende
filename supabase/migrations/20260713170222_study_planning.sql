-- Espacio de planificación: agenda académica compartida por curso y apuntes.
-- privados asociados a cada lección. Ambas tablas se exponen a la Data API,
-- por lo que los permisos SQL y RLS se declaran de forma explícita.

CREATE TABLE public.eventos_academicos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id      UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 1 AND 160),
  tipo          TEXT NOT NULL DEFAULT 'aviso' CHECK (tipo IN ('evaluacion', 'entrega', 'sesion', 'aviso')),
  descripcion   TEXT,
  fecha_inicio  TIMESTAMPTZ NOT NULL,
  fecha_fin     TIMESTAMPTZ,
  creado_por    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eventos_academicos_fechas_validas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX idx_eventos_academicos_curso_fecha
  ON public.eventos_academicos (curso_id, fecha_inicio);

CREATE TABLE public.notas_leccion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  curso_id      UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  leccion_id    UUID NOT NULL REFERENCES public.lecciones(id) ON DELETE CASCADE,
  contenido     TEXT NOT NULL DEFAULT '' CHECK (char_length(contenido) <= 20000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumno_id, leccion_id)
);

CREATE INDEX idx_notas_leccion_alumno_actualizadas
  ON public.notas_leccion (alumno_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_academicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_leccion TO authenticated;

ALTER TABLE public.eventos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_leccion ENABLE ROW LEVEL SECURITY;

-- Cada participante ve solo la agenda de sus cursos. El profesor y los
-- administradores mantienen visibilidad editorial; el supervisor ve la de su cohorte.
CREATE POLICY eventos_academicos_select
ON public.eventos_academicos
FOR SELECT
TO authenticated
USING (
  (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.cursos c
    WHERE c.id = eventos_academicos.curso_id AND c.profesor_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.inscripciones i
    WHERE i.curso_id = eventos_academicos.curso_id
      AND i.alumno_id = (select auth.uid())
      AND i.estado IN ('activa', 'completada')
  )
  OR EXISTS (
    SELECT 1 FROM public.cursos c
    WHERE c.id = eventos_academicos.curso_id
      AND (select current_rol()) = 'supervisor'
      AND c.institucion_id = (select current_institucion())
  )
);

CREATE POLICY eventos_academicos_insert
ON public.eventos_academicos
FOR INSERT
TO authenticated
WITH CHECK (
  creado_por = (select auth.uid())
  AND (
    (select is_admin())
    OR EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = eventos_academicos.curso_id AND c.profesor_id = (select auth.uid())
    )
  )
);

CREATE POLICY eventos_academicos_update
ON public.eventos_academicos
FOR UPDATE
TO authenticated
USING (
  (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.cursos c
    WHERE c.id = eventos_academicos.curso_id AND c.profesor_id = (select auth.uid())
  )
)
WITH CHECK (
  creado_por = (select auth.uid())
  AND (
    (select is_admin())
    OR EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = eventos_academicos.curso_id AND c.profesor_id = (select auth.uid())
    )
  )
);

CREATE POLICY eventos_academicos_delete
ON public.eventos_academicos
FOR DELETE
TO authenticated
USING (
  (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.cursos c
    WHERE c.id = eventos_academicos.curso_id AND c.profesor_id = (select auth.uid())
  )
);

-- Los apuntes son exclusivamente del alumno. También se valida que la lección
-- corresponda al curso para evitar vincular una nota a contenido ajeno.
CREATE POLICY notas_leccion_select
ON public.notas_leccion
FOR SELECT
TO authenticated
USING (alumno_id = (select auth.uid()));

CREATE POLICY notas_leccion_insert
ON public.notas_leccion
FOR INSERT
TO authenticated
WITH CHECK (
  alumno_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.lecciones l
    WHERE l.id = notas_leccion.leccion_id AND l.curso_id = notas_leccion.curso_id
  )
);

CREATE POLICY notas_leccion_update
ON public.notas_leccion
FOR UPDATE
TO authenticated
USING (alumno_id = (select auth.uid()))
WITH CHECK (
  alumno_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.lecciones l
    WHERE l.id = notas_leccion.leccion_id AND l.curso_id = notas_leccion.curso_id
  )
);

CREATE POLICY notas_leccion_delete
ON public.notas_leccion
FOR DELETE
TO authenticated
USING (alumno_id = (select auth.uid()));
