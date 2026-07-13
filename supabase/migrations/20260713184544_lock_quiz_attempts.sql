-- Los intentos se crean y califican exclusivamente desde la API de servidor (aplicada en producción).
-- El alumno conserva visibilidad sobre los suyos, pero no puede reescribir
-- respuestas, puntajes ni feedback docente mediante la Data API.
DROP POLICY IF EXISTS intentos_alumno ON public.quiz_intentos;

CREATE POLICY intentos_alumno_read ON public.quiz_intentos
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = alumno_id);
