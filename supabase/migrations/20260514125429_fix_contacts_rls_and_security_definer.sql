/*
  # Fix RLS policies and SECURITY DEFINER function

  ## Problems fixed

  1. contacts table — INSERT/UPDATE/DELETE policies allowed unrestricted access to
     both `anon` and `authenticated`. Replaced with policies scoped to
     `authenticated` only, matching the original intent of this single-user rabbi app.

  2. SELECT on contacts — kept as `authenticated` only (removed anon).

  3. update_updated_at() — was created without explicit SECURITY clause, which
     defaults to SECURITY DEFINER in some contexts and was callable via REST.
     Recreated as SECURITY INVOKER and REVOKE EXECUTE from anon/authenticated so
     it cannot be called directly via /rpc/.

  ## Changes
  - Drop all four overly-permissive contacts policies
  - Recreate them for `authenticated` only (USING (true) is fine here — this is a
    single-owner app with no per-row ownership concept)
  - Recreate update_updated_at() as SECURITY INVOKER
  - REVOKE direct EXECUTE on the function from anon and authenticated
*/

-- 1. Drop the overly-permissive contacts policies
DROP POLICY IF EXISTS "Allow select contacts" ON contacts;
DROP POLICY IF EXISTS "Allow insert contacts" ON contacts;
DROP POLICY IF EXISTS "Allow update contacts" ON contacts;
DROP POLICY IF EXISTS "Allow delete contacts" ON contacts;

-- 2. Recreate them scoped to authenticated only
CREATE POLICY "Authenticated users can select contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (true);

-- 3. Recreate the trigger function as SECURITY INVOKER so it runs with the
--    caller's privileges (trigger context), not the definer's.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Revoke direct execution from public roles so it cannot be called via /rpc/
REVOKE EXECUTE ON FUNCTION update_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION update_updated_at() FROM authenticated;
