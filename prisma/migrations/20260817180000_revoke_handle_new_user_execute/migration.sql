-- Postgres grants EXECUTE to PUBLIC on every new function by default. This
-- trigger function only needs to run as part of the on_auth_user_created
-- trigger (which fires regardless of the invoking session's grants) — no
-- role should be able to call it directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
