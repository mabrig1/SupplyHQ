-- Opt-in LLM usage quota: maximum three calls per seller per UTC day.
CREATE TABLE IF NOT EXISTS agent_daily_usage (
  owner_user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  model_calls INTEGER NOT NULL DEFAULT 0 CHECK(model_calls>=0),
  PRIMARY KEY(owner_user_id, day),
  FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_agent_daily_usage_day ON agent_daily_usage(day);
