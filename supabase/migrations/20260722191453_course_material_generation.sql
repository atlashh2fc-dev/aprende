-- Material fuente y trazabilidad para la construcción asistida de cursos.
-- Los archivos permanecen privados; solo el profesor dueño y los administradores
-- pueden verlos o generar contenido a partir de ellos.

CREATE TABLE public.curso_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  tamanio_bytes BIGINT NOT NULL CHECK (tamanio_bytes > 0),
  estado TEXT NOT NULL DEFAULT 'subido'
    CHECK (estado IN ('subido', 'procesando', 'listo', 'error')),
  texto_extraido TEXT,
  llama_file_id TEXT,
  llama_job_id TEXT,
  detalle_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX curso_materiales_curso_idx ON public.curso_materiales(curso_id, created_at);

CREATE TABLE public.curso_generaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  creado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'procesando'
    CHECK (estado IN ('procesando', 'completado', 'error')),
  materiales_procesados INT NOT NULL DEFAULT 0,
  detalle_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX curso_generaciones_curso_idx ON public.curso_generaciones(curso_id, created_at DESC);

ALTER TABLE public.curso_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_generaciones ENABLE ROW LEVEL SECURITY;

-- El acceso de la aplicación es exclusivamente para sesiones autenticadas;
-- las políticas RLS siguientes limitan las filas al dueño del curso o admin.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curso_materiales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curso_generaciones TO authenticated;

CREATE POLICY curso_materiales_owner_all ON public.curso_materiales
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = curso_materiales.curso_id
        AND (c.profesor_id = (select auth.uid()) OR (select public.is_admin()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = curso_materiales.curso_id
        AND (c.profesor_id = (select auth.uid()) OR (select public.is_admin()))
    )
  );

CREATE POLICY curso_generaciones_owner_all ON public.curso_generaciones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = curso_generaciones.curso_id
        AND (c.profesor_id = (select auth.uid()) OR (select public.is_admin()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cursos c
      WHERE c.id = curso_generaciones.curso_id
        AND (c.profesor_id = (select auth.uid()) OR (select public.is_admin()))
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materiales-curso',
  'materiales-curso',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/markdown',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- La primera carpeta es el ID del profesor. El archivo nunca es público.
CREATE POLICY materiales_curso_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materiales-curso'
    AND ((storage.foldername(name))[1] = ((select auth.uid())::text) OR (select public.is_admin()))
  );

CREATE POLICY materiales_curso_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materiales-curso'
    AND ((storage.foldername(name))[1] = ((select auth.uid())::text) OR (select public.is_admin()))
  );

CREATE POLICY materiales_curso_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'materiales-curso'
    AND ((storage.foldername(name))[1] = ((select auth.uid())::text) OR (select public.is_admin()))
  );
