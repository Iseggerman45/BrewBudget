-- Secure future objects created by the postgres migration/SQL-editor role.
-- Existing objects were hardened separately; these defaults prevent privilege
-- regressions when new public-schema objects are created by postgres.

alter default privileges for role postgres in schema public
  revoke all on tables from anon;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
