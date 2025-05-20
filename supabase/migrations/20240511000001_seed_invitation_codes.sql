-- Poblado inicial de 100 códigos de invitación aleatorios
INSERT INTO public.invitation_codes (code)
SELECT SUBSTRING(md5(random()::text) FROM 1 FOR 10) AS code
FROM generate_series(1, 150)  -- generar más para asegurar unicidad
ON CONFLICT DO NOTHING; 