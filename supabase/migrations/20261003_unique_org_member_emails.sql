-- Keep the highest-privilege membership (and the organization owner) when cleaning duplicates.
WITH ranked_members AS (
  SELECT
    m.id,
    row_number() OVER (
      PARTITION BY m.org_id, lower(trim(m.email))
      ORDER BY
        (m.user_id = o.owner_uid) DESC,
        CASE m.role::text
          WHEN 'owner' THEN 4
          WHEN 'admin' THEN 3
          WHEN 'editor' THEN 2
          WHEN 'viewer' THEN 1
          ELSE 0
        END DESC,
        m.joined_at ASC,
        m.id ASC
    ) AS duplicate_rank
  FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.org_id
)
DELETE FROM public.organization_members m
USING ranked_members r
WHERE m.id = r.id
  AND r.duplicate_rank > 1;

-- Keep the newest pending invitation for each email; older duplicates are revoked.
WITH ranked_invitations AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY org_id, lower(trim(email))
      ORDER BY created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.invitations
  WHERE status = 'pending'
)
UPDATE public.invitations i
SET status = 'revoked'
FROM ranked_invitations r
WHERE i.id = r.id
  AND r.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_email_key
  ON public.organization_members (org_id, lower(trim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_pending_per_org_email
  ON public.invitations (org_id, lower(trim(email)))
  WHERE status = 'pending';