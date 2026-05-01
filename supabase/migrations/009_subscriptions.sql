-- User subscription tiers (free | pro)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                  TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
  billing_interval      TEXT,                           -- 'month' | 'year' | null
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription row
CREATE POLICY "users_read_own_subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
