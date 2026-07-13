-- Aplicada en producción: evita políticas SELECT superpuestas e indexa ambas claves foráneas de los resultados.
CREATE INDEX entrega_rubrica_resultados_rubrica_idx ON public.entrega_rubrica_resultados (rubrica_id);

DROP POLICY tarea_rubricas_staff_write ON public.tarea_rubricas;

CREATE POLICY tarea_rubricas_staff_insert ON public.tarea_rubricas FOR INSERT TO authenticated WITH CHECK (
  (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.tareas t JOIN public.cursos c ON c.id = t.curso_id
    WHERE t.id = tarea_rubricas.tarea_id AND c.profesor_id = (select auth.uid())
  )
);

CREATE POLICY tarea_rubricas_staff_update ON public.tarea_rubricas FOR UPDATE TO authenticated USING (
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

CREATE POLICY tarea_rubricas_staff_delete ON public.tarea_rubricas FOR DELETE TO authenticated USING (
  (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.tareas t JOIN public.cursos c ON c.id = t.curso_id
    WHERE t.id = tarea_rubricas.tarea_id AND c.profesor_id = (select auth.uid())
  )
);
