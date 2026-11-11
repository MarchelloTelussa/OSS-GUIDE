-- Create role quantum if not exists for GRANT statements in dump
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'quantum') THEN
    CREATE ROLE quantum WITH LOGIN PASSWORD 'app_password';
  END IF;
END
$$;