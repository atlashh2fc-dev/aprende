-- Avisos personales en la plataforma (aplicada en producción). Solo el servidor genera avisos de curso;
-- cada destinatario puede leerlos y marcar únicamente su propio aviso como leído.
CREATE TABLE public.notificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  curso_id    UUID REFERENCES public.cursos(id) ON DELETE CASCADE,
  evento_id   UUID REFERENCES public.eventos_academicos(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('evaluacion', 'entrega', 'sesion', 'aviso')),
  titulo      TEXT NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 1 AND 160),
  mensaje     TEXT CHECK (mensaje IS NULL OR char_length(mensaje) <= 2000),
  enlace      TEXT CHECK (enlace IS NULL OR char_length(enlace) <= 500),
  leida_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notificaciones_usuario_estado_fecha_idx
  ON public.notificaciones (usuario_id, leida_at, created_at DESC);

ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_evento_usuario_unico UNIQUE (evento_id, usuario_id);

-- No se concede INSERT/DELETE al navegador. El endpoint de servidor usa la
-- clave de servicio tras validar que el emisor controla el curso.
REVOKE ALL PRIVILEGES ON TABLE public.notificaciones FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notificaciones TO authenticated;
GRANT UPDATE (leida_at) ON public.notificaciones TO authenticated;

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY notificaciones_select_propias
ON public.notificaciones
FOR SELECT
TO authenticated
USING (usuario_id = (select auth.uid()));

CREATE POLICY notificaciones_marcar_leida_propias
ON public.notificaciones
FOR UPDATE
TO authenticated
USING (usuario_id = (select auth.uid()))
WITH CHECK (usuario_id = (select auth.uid()));
