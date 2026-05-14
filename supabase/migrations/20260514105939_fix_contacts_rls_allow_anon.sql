/*
  # Fix contacts RLS to allow anon access (Auth is currently disabled in UI)

  Since authentication is temporarily disabled in the application, the contacts
  table must also allow the anon role to perform CRUD operations.

  Changes:
  - Drop existing INSERT/UPDATE/DELETE policies that require auth.uid()
  - Recreate them to also allow the anon role
  - SELECT policy already uses USING (true) so anon can read
*/

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can select contacts" ON contacts;

-- New permissive policies for both anon and authenticated
CREATE POLICY "Allow select contacts"
  ON contacts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert contacts"
  ON contacts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update contacts"
  ON contacts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete contacts"
  ON contacts FOR DELETE
  TO anon, authenticated
  USING (true);
