-- Reportería docente: un profesor puede identificar únicamente a alumnos que
-- están inscritos en alguno de sus propios cursos. No concede escritura ni
-- acceso a alumnos de otros profesores o instituciones.
CREATE POLICY profiles_profesor_alumnos_inscritos
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.inscripciones AS i
    JOIN public.cursos AS c ON c.id = i.curso_id
    WHERE i.alumno_id = profiles.id
      AND c.profesor_id = (select auth.uid())
  )
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_curso_alumno
ON public.inscripciones (curso_id, alumno_id);

CREATE INDEX IF NOT EXISTS idx_progreso_alumno_curso_ultima_vista
ON public.progreso_lecciones (alumno_id, curso_id, ultima_vista DESC);
