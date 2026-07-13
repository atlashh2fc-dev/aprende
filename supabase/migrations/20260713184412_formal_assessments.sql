-- Evaluaciones formales: plazos, intentos y retroalimentación docente (aplicada en producción).
-- Los intentos siguen protegidos por las políticas RLS existentes; el feedback
-- se escribe mediante una API de servidor que valida al profesor responsable.

ALTER TABLE public.quizzes
  ADD COLUMN fecha_limite TIMESTAMPTZ,
  ADD COLUMN intentos_maximos INTEGER;

ALTER TABLE public.quizzes
  ADD CONSTRAINT quizzes_intentos_maximos_positivo
  CHECK (intentos_maximos IS NULL OR intentos_maximos > 0);

ALTER TABLE public.quiz_intentos
  ADD COLUMN feedback_docente TEXT,
  ADD COLUMN revisado_at TIMESTAMPTZ,
  ADD COLUMN revisado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX quiz_intentos_quiz_alumno_created_idx
  ON public.quiz_intentos (quiz_id, alumno_id, created_at DESC);

CREATE INDEX quizzes_curso_id_idx ON public.quizzes (curso_id);
