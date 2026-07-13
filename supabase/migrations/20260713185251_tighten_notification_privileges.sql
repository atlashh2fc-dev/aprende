-- El proyecto hereda permisos de tabla amplios (aplicada en producción); esta bandeja solo permite
-- lectura y modificar el sello de lectura desde el navegador.
REVOKE ALL PRIVILEGES ON TABLE public.notificaciones FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notificaciones TO authenticated;
GRANT UPDATE (leida_at) ON public.notificaciones TO authenticated;
