-- La institución actúa como cohorte operativa. Cada asignación puede llevar
-- una fecha límite para habilitar seguimiento de cumplimiento.
ALTER TABLE public.inscripciones
ADD COLUMN IF NOT EXISTS fecha_limite timestamptz;

CREATE INDEX IF NOT EXISTS idx_inscripciones_curso_fecha_limite
ON public.inscripciones (curso_id, fecha_limite)
WHERE fecha_limite IS NOT NULL;

-- El supervisor solo puede asignar alumnos y cursos de su propia institución.
CREATE POLICY inscripciones_supervisor_assign
ON public.inscripciones
FOR INSERT
TO authenticated
WITH CHECK (
  (select current_rol()) = 'supervisor'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    JOIN public.cursos AS c ON c.id = inscripciones.curso_id
    WHERE p.id = inscripciones.alumno_id
      AND p.institucion_id = (select current_institucion())
      AND c.institucion_id = (select current_institucion())
  )
);

CREATE POLICY inscripciones_supervisor_update
ON public.inscripciones
FOR UPDATE
TO authenticated
USING (
  (select current_rol()) = 'supervisor'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    JOIN public.cursos AS c ON c.id = inscripciones.curso_id
    WHERE p.id = inscripciones.alumno_id
      AND p.institucion_id = (select current_institucion())
      AND c.institucion_id = (select current_institucion())
  )
)
WITH CHECK (
  (select current_rol()) = 'supervisor'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    JOIN public.cursos AS c ON c.id = inscripciones.curso_id
    WHERE p.id = inscripciones.alumno_id
      AND p.institucion_id = (select current_institucion())
      AND c.institucion_id = (select current_institucion())
  )
);
