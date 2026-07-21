-- Segmentación organizacional para distribuir capacitaciones por área,
-- unidad de negocio o campaña dentro de cada institución.
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'area' CHECK (tipo IN ('area', 'unidad_negocio', 'campana')),
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institucion_id, slug)
);

-- Una persona puede pertenecer a varias áreas; por ejemplo, RR.HH. y una campaña.
CREATE TABLE public.profile_areas (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, area_id)
);

-- Una capacitación puede distribuirse a varias áreas o unidades de negocio.
CREATE TABLE public.curso_areas (
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (curso_id, area_id)
);

CREATE INDEX idx_areas_institucion ON public.areas(institucion_id);
CREATE INDEX idx_profile_areas_area ON public.profile_areas(area_id);
CREATE INDEX idx_curso_areas_area ON public.curso_areas(area_id);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY areas_select ON public.areas FOR SELECT TO authenticated
USING (is_admin() OR institucion_id = (select current_institucion()));
CREATE POLICY areas_admin_write ON public.areas FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- El alumno sólo puede consultar sus propias pertenencias; el admin las administra.
CREATE POLICY profile_areas_select ON public.profile_areas FOR SELECT TO authenticated
USING (is_admin() OR profile_id = (select auth.uid()));
CREATE POLICY profile_areas_admin_write ON public.profile_areas FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- Las asignaciones de cursos son visibles dentro de la institución para que
-- la política de cursos pueda filtrar correctamente el catálogo.
CREATE POLICY curso_areas_select ON public.curso_areas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.areas a
    WHERE a.id = curso_areas.area_id
      AND (is_admin() OR a.institucion_id = (select current_institucion()))
  )
);
CREATE POLICY curso_areas_admin_write ON public.curso_areas FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- Al sumar una persona o un curso a un área, se crea la inscripción requerida.
-- No se elimina historial al quitar una pertenencia: el acceso al contenido sí
-- queda revocado por la política de cursos, pero el registro de aprendizaje se conserva.
CREATE OR REPLACE FUNCTION public.enroll_members_when_area_is_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inscripciones (alumno_id, curso_id, estado)
  SELECT pa.profile_id, NEW.curso_id, 'activa'::inscripcion_estado
  FROM public.profile_areas pa
  JOIN public.profiles p ON p.id = pa.profile_id
  WHERE pa.area_id = NEW.area_id
    AND p.rol = 'alumno'
  ON CONFLICT (alumno_id, curso_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_area_courses_when_member_is_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inscripciones (alumno_id, curso_id, estado)
  SELECT NEW.profile_id, ca.curso_id, 'activa'::inscripcion_estado
  FROM public.curso_areas ca
  JOIN public.profiles p ON p.id = NEW.profile_id
  WHERE ca.area_id = NEW.area_id
    AND p.rol = 'alumno'
  ON CONFLICT (alumno_id, curso_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_members_when_area_is_assigned() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enroll_area_courses_when_member_is_assigned() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enroll_members_when_area_is_assigned() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enroll_area_courses_when_member_is_assigned() FROM anon, authenticated;

CREATE TRIGGER curso_areas_enroll_members
AFTER INSERT ON public.curso_areas
FOR EACH ROW EXECUTE FUNCTION public.enroll_members_when_area_is_assigned();

CREATE TRIGGER profile_areas_enroll_courses
AFTER INSERT ON public.profile_areas
FOR EACH ROW EXECUTE FUNCTION public.enroll_area_courses_when_member_is_assigned();

-- Los cursos sin áreas siguen siendo capacitación abierta dentro de la empresa.
-- Al asignar una o más áreas, sólo los miembros de esas áreas ven el curso.
DROP POLICY IF EXISTS cursos_select ON public.cursos;
CREATE POLICY cursos_select ON public.cursos FOR SELECT TO authenticated USING (
  is_admin()
  OR profesor_id = (select auth.uid())
  OR ((select current_rol()) = 'supervisor' AND institucion_id = (select current_institucion()))
  OR (
    estado = 'publicado'
    AND institucion_id = (select current_institucion())
    AND (
      NOT EXISTS (SELECT 1 FROM public.curso_areas ca WHERE ca.curso_id = cursos.id)
      OR EXISTS (
        SELECT 1
        FROM public.curso_areas ca
        JOIN public.profile_areas pa ON pa.area_id = ca.area_id
        WHERE ca.curso_id = cursos.id
          AND pa.profile_id = (select auth.uid())
      )
    )
  )
);

-- Evita que un alumno se inscriba por API a un curso segmentado para otra área.
DROP POLICY IF EXISTS inscripciones_alumno ON public.inscripciones;
CREATE POLICY inscripciones_alumno ON public.inscripciones FOR ALL TO authenticated
USING (alumno_id = (select auth.uid()))
WITH CHECK (
  alumno_id = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.cursos c
    WHERE c.id = inscripciones.curso_id
      AND c.institucion_id = (select current_institucion())
      AND (
        NOT EXISTS (SELECT 1 FROM public.curso_areas ca WHERE ca.curso_id = c.id)
        OR EXISTS (
          SELECT 1
          FROM public.curso_areas ca
          JOIN public.profile_areas pa ON pa.area_id = ca.area_id
          WHERE ca.curso_id = c.id
            AND pa.profile_id = (select auth.uid())
        )
      )
  )
);
