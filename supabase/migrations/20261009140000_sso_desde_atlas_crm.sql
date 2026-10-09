-- Entrada desde Atlas CRM con la misma sesión.
--
-- Atlas firma un pase de un solo uso (app/api/sso/atlas). Acá se registra cada
-- pase consumido para que no se pueda reutilizar. Solo lo toca el servidor
-- con service_role: RLS activo y sin políticas.
CREATE TABLE IF NOT EXISTS public.sso_pases_usados (
  jti        TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  origen     TEXT NOT NULL DEFAULT 'atlas-crm',
  usado_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sso_pases_usados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sso_pases_usados FROM anon, authenticated;
