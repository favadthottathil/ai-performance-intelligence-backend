-- A database created before the API treated apps as many-per-user can carry a
-- unique rule on apps(user_id) that no migration here creates. With it in
-- place, a user's second POST /apps fails with a unique violation. Postgres
-- reports a unique index and a unique constraint with the same message, so
-- both forms are dropped; IF EXISTS makes this a no-op everywhere else.
ALTER TABLE apps DROP CONSTRAINT IF EXISTS unique_user_app;
DROP INDEX IF EXISTS unique_user_app;
