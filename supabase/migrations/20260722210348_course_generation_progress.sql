-- Progreso visible y diagnóstico de la construcción asistida de cursos.
-- Las columnas se mantienen en la misma tabla ya protegida por RLS: solo el
-- dueño del curso o un administrador puede leer cada generación.
ALTER TABLE public.curso_generaciones
  ADD COLUMN progreso SMALLINT NOT NULL DEFAULT 0
    CHECK (progreso >= 0 AND progreso <= 100),
  ADD COLUMN etapa TEXT NOT NULL DEFAULT 'En cola',
  ADD COLUMN mensaje_progreso TEXT;

UPDATE public.curso_generaciones
SET progreso = CASE estado
  WHEN 'completado' THEN 100
  WHEN 'error' THEN 100
  ELSE 0
END,
etapa = CASE estado
  WHEN 'completado' THEN 'Curso listo'
  WHEN 'error' THEN 'No se pudo completar'
  ELSE 'Procesando'
END
WHERE progreso = 0 AND etapa = 'En cola';

CREATE INDEX curso_generaciones_curso_estado_created_idx
  ON public.curso_generaciones (curso_id, estado, created_at DESC);
