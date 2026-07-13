-- Entregas evaluables (aplicada en producción): instrumento publicado por el docente y una entrega por alumno.
CREATE TABLE public.tareas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id            UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  titulo              TEXT NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 1 AND 160),
  instrucciones       TEXT NOT NULL DEFAULT '' CHECK (char_length(instrucciones) <= 12000),
  fecha_limite        TIMESTAMPTZ,
  puntaje_maximo      INTEGER NOT NULL DEFAULT 100 CHECK (puntaje_maximo BETWEEN 1 AND 10000),
  permitir_reentrega  BOOLEAN NOT NULL DEFAULT TRUE,
  publicada           BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.entregas_tarea (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id            UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  alumno_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto               TEXT CHECK (texto IS NULL OR char_length(texto) <= 12000),
  enlace              TEXT CHECK (enlace IS NULL OR char_length(enlace) <= 500),
  archivo_path        TEXT CHECK (archivo_path IS NULL OR char_length(archivo_path) <= 800),
  estado              TEXT NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada', 'atrasada', 'revisada')),
  entregado_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  puntaje             INTEGER CHECK (puntaje IS NULL OR puntaje >= 0),
  feedback_docente    TEXT CHECK (feedback_docente IS NULL OR char_length(feedback_docente) <= 4000),
  revisado_at         TIMESTAMPTZ,
  revisado_por        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tarea_id, alumno_id)
);

CREATE INDEX tareas_curso_limite_idx ON public.tareas (curso_id, fecha_limite);
CREATE INDEX entregas_tarea_alumno_idx ON public.entregas_tarea (alumno_id, tarea_id);

REVOKE ALL PRIVILEGES ON TABLE public.tareas, public.entregas_tarea FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas TO authenticated;
GRANT SELECT ON public.entregas_tarea TO authenticated;

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_tarea ENABLE ROW LEVEL SECURITY;

CREATE POLICY tareas_select ON public.tareas FOR SELECT TO authenticated USING (
  (select is_admin())
  OR EXISTS (SELECT 1 FROM public.cursos c WHERE c.id = tareas.curso_id AND c.profesor_id = (select auth.uid()))
  OR (tareas.publicada AND EXISTS (
    SELECT 1 FROM public.inscripciones i
    WHERE i.curso_id = tareas.curso_id AND i.alumno_id = (select auth.uid()) AND i.estado IN ('activa', 'completada')
  ))
);

CREATE POLICY tareas_staff_write ON public.tareas FOR ALL TO authenticated USING (
  (select is_admin())
  OR EXISTS (SELECT 1 FROM public.cursos c WHERE c.id = tareas.curso_id AND c.profesor_id = (select auth.uid()))
) WITH CHECK (
  (select is_admin())
  OR (creado_por = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.cursos c WHERE c.id = tareas.curso_id AND c.profesor_id = (select auth.uid())))
);

CREATE POLICY entregas_select ON public.entregas_tarea FOR SELECT TO authenticated USING (
  alumno_id = (select auth.uid())
  OR (select is_admin())
  OR EXISTS (
    SELECT 1 FROM public.tareas t JOIN public.cursos c ON c.id = t.curso_id
    WHERE t.id = entregas_tarea.tarea_id AND c.profesor_id = (select auth.uid())
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('entregas', 'entregas', false, 10485760, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY entregas_archivos_alumno_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'entregas' AND (storage.foldername(name))[1] = ((select auth.uid())::text)
);
CREATE POLICY entregas_archivos_alumno_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'entregas' AND (storage.foldername(name))[1] = ((select auth.uid())::text)
);
CREATE POLICY entregas_archivos_alumno_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'entregas' AND (storage.foldername(name))[1] = ((select auth.uid())::text)
);
