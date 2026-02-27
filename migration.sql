-- Add status column to cogs_projects table
ALTER TABLE cogs_projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'estimated';

-- Add updated_at column for tracking changes
ALTER TABLE cogs_projects 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing projects to have 'estimated' status
UPDATE cogs_projects 
SET status = 'estimated' 
WHERE status IS NULL;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_cogs_projects_status ON cogs_projects(status);
CREATE INDEX IF NOT EXISTS idx_cogs_projects_model ON cogs_projects(model);