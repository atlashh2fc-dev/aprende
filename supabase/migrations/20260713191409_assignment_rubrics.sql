-- Rúbricas evaluables aplicadas en producción: criterios definidos por el docente y resultados por entrega.
CREATE TABLE public.tarea_rubricas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id          UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  criterio          TEXT NOT NULL CHECK (char_length(trim(criterio)) BETWEEN 1 AND 200),
  descripcion       TEXT CHECK (descripcion IS NULL OR char_length(descripcion) <= 1000),
  puntaje_maximo    INTEGER NOT NULL CHECK (puntaje_maximo BETWEEN 1 AND 10000),
  orden             INTEGER NOT NULL DEFAULT 0 CHECK (orden >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.entrega_rubrica_resultados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id        UUID NOT NULL REFERENCES public.entregas_tarea(id) ON DELETE CASCADE,
  rubrica_id        UUID NOT NULL REFERENCES public.tarea_rubricas(id) ON DELETE CASCADE,
  puntaje           INTEGER NOT NULL CHECK (puntaje >= 0),
  comentario        TEXT CHECK (comentario IS NULL OR char_length(comentario) <= 2000),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entrega_id, rubrica_id)
);

CREATE INDEX tarea_rubricas_tarea_orden_idx ON public.tarea_rubricas (tarea_id, orden, created_at);
CREATE INDEX entrega_rubrica_resultados_entrega_idx ON public.entrega_rubrica_resultados (entrega_id);

REVOKE ALL PRIVILEGES ON TABLE public.tarea_rubricas, public.entrega_rubrica_resultados FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarea_rubricas TO authenticated;
GRANT SELECT ON public.entrega_rubrica_resultados TO authenticated;

ALTER TABLE public.tarea_rubricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrega_rubrica_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY tarea_rubricas_select ON public.tarea_rubricas FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tareas t
    WHERE t.id = tarea_rubricas.tarea_id
      AND (
        (select is_admin())
        OR EXISTS (SELECT 1 FROM public.cursos c WHERE c.id = t.curso_id AND c.profesor_id = (select auth.uid()))
        OR (t.publicada AND EXISTS (
          SELECT 1 FROM public.inscripciones i
          WHERE i.curso_id = t.curso_id AND i.alumno_id = (select auth.uid()) AND i.estado IN ('activa', 'completada')
        ))
      )
  )
);

CREATE POLICY tarea_rubricas_staff_write ON public.tarea_rubricas FOR ALL TO authenticated USING (
  (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.tareas t JOIN public.cursos c ON c.id = t.curso_id
    WHERE t.id = tarea_rubricas.tarea_id AND c.profesor_id = (select auth.uid())
  )
) WITH CHECK (
  (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.tareas t JOIN public.cursos c ON c.id = t.curso_id
    WHERE t.id = tarea_rubricas.tarea_id AND c.profesor_id = (select auth.uid())
  )
);

CREATE POLICY entrega_rubrica_resultados_select ON public.entrega_rubrica_resultados FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.entregas_tarea e
    JOIN public.tareas t ON t.id = e.tarea_id
    LEFT JOIN public.cursos c ON c.id = t.curso_id
    WHERE e.id = entrega_rubrica_resultados.entrega_id
      AND (e.alumno_id = (select auth.uid()) OR (select is_admin()) OR c.profesor_id = (select auth.uid()))
  )
);
