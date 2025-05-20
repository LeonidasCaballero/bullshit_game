-- Conceder privilegios de SELECT y UPDATE sobre invitation_codes a los roles por defecto de Supabase
GRANT SELECT, UPDATE ON TABLE public.invitation_codes TO anon, authenticated; 