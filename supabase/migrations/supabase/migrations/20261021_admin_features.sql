
-- ============================================================
-- ThriftFinder: Proposed Admin Feature Tables
-- Date: 2026-10-21
--
-- Creates:
--   1. admin_accounts
--   2. reports
--   3. user_moderation_actions
--   4. admin_activity_logs
--
-- Preserves existing marketplace tables.
-- Does NOT create or modify existing tables.
-- Does NOT insert an initial admin account.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ADMIN ACCOUNTS
-- Separate admin authorization from ordinary user profiles.
-- One profile can have at most one admin account.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_accounts (
    profile_id UUID PRIMARY KEY
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    admin_role TEXT NOT NULL DEFAULT 'admin'
        CHECK (admin_role IN ('super_admin', 'admin', 'moderator')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_accounts IS
    'PROPOSED: Admin authorization records linked to existing user profiles.';


-- ============================================================
-- 2. REPORTS
-- Each report targets exactly one listing, user, or message.
-- Existing marketplace records are referenced, not duplicated.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reporter_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    target_type TEXT NOT NULL
        CHECK (target_type IN ('listing', 'user', 'message')),

    listing_id UUID
        REFERENCES public.listings(id)
        ON DELETE RESTRICT,

    reported_user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    message_id UUID
        REFERENCES public.messages(id)
        ON DELETE RESTRICT,

    reason TEXT NOT NULL,
    details TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'reviewing',
                'resolved',
                'dismissed'
            )
        ),

    reviewed_by UUID
        REFERENCES public.admin_accounts(profile_id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMPTZ,
    resolution_note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Exactly one target must be selected, and it must match
    -- the declared target_type.
    CONSTRAINT reports_exactly_one_target CHECK (
        (
            target_type = 'listing'
            AND listing_id IS NOT NULL
            AND reported_user_id IS NULL
            AND message_id IS NULL
        )
        OR
        (
            target_type = 'user'
            AND listing_id IS NULL
            AND reported_user_id IS NOT NULL
            AND message_id IS NULL
        )
        OR
        (
            target_type = 'message'
            AND listing_id IS NULL
            AND reported_user_id IS NULL
            AND message_id IS NOT NULL
        )
    ),

    -- A report marked as reviewed must identify the review time.
    CONSTRAINT reports_review_metadata CHECK (
        (reviewed_by IS NULL AND reviewed_at IS NULL)
        OR
        (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

COMMENT ON TABLE public.reports IS
    'PROPOSED: User-submitted reports targeting one listing, user, or message.';


-- ============================================================
-- 3. USER MODERATION ACTIONS
-- Stores a history of moderation actions instead of overwriting
-- prior actions. Current account status can be derived separately.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    target_user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    admin_id UUID NOT NULL
        REFERENCES public.admin_accounts(profile_id)
        ON DELETE RESTRICT,

    action_type TEXT NOT NULL
        CHECK (
            action_type IN (
                'warn',
                'suspend',
                'reinstate'
            )
        ),

    reason TEXT NOT NULL,

    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT moderation_valid_dates CHECK (
        ends_at IS NULL
        OR starts_at IS NULL
        OR ends_at > starts_at
    )
);

COMMENT ON TABLE public.user_moderation_actions IS
    'PROPOSED: Append-only history of user moderation actions.';


-- ============================================================
-- 4. ADMIN ACTIVITY LOGS
-- Records admin actions and system-generated events.
-- target_id is polymorphic: it can refer to different entity types.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    actor_type TEXT NOT NULL
        CHECK (actor_type IN ('admin', 'system')),

    action TEXT NOT NULL,

    target_type TEXT,
    target_id UUID,

    details JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT activity_actor_type_check CHECK (
        (actor_type = 'admin' AND actor_id IS NOT NULL)
        OR
        actor_type = 'system'
    )
);

COMMENT ON TABLE public.admin_activity_logs IS
    'PROPOSED: Audit history for admin actions and system events.';


-- ============================================================
-- 5. INDEXES
-- Support common admin dashboard lookups and filters.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admin_accounts_role_active
    ON public.admin_accounts (admin_role, is_active);

CREATE INDEX IF NOT EXISTS idx_reports_status_created
    ON public.reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reporter
    ON public.reports (reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_listing
    ON public.reports (listing_id)
    WHERE listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_reported_user
    ON public.reports (reported_user_id)
    WHERE reported_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_message
    ON public.reports (message_id)
    WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_reviewer
    ON public.reports (reviewed_by)
    WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_target_created
    ON public.user_moderation_actions (
        target_user_id,
        created_at DESC
    );

CREATE INDEX IF NOT EXISTS idx_moderation_admin
    ON public.user_moderation_actions (admin_id);

CREATE INDEX IF NOT EXISTS idx_activity_created
    ON public.admin_activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_actor_created
    ON public.admin_activity_logs (
        actor_id,
        created_at DESC
    );

CREATE INDEX IF NOT EXISTS idx_activity_target
    ON public.admin_activity_logs (
        target_type,
        target_id
    );


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- Enable RLS on all new public tables.
--
-- Intentionally creates NO access policies here. These tables
-- remain inaccessible through normal client roles until explicit,
-- properly authorized policies are designed and added.
-- ============================================================

ALTER TABLE public.admin_accounts
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reports
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_moderation_actions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_activity_logs
    ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================
-- END
-- No existing marketplace table is created or altered.
-- ============================================================
