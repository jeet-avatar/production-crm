-- Migration: Add userId to tags and positions tables
-- Date: 2025-10-10

-- Step 1: Get the first user ID to use as default
DO $$
DECLARE
    default_user_id TEXT;
BEGIN
    -- Get the first user ID
    SELECT id INTO default_user_id FROM users LIMIT 1;
    
    -- Add userId column to tags table with default value
    ALTER TABLE tags 
    ADD COLUMN IF NOT EXISTS "userId" TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    
    -- Set default userId for existing tags
    UPDATE tags SET "userId" = default_user_id WHERE "userId" IS NULL;
    
    -- Make userId NOT NULL
    ALTER TABLE tags ALTER COLUMN "userId" SET NOT NULL;
    
    -- Drop the old unique constraint on name
    ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
    
    -- Add new unique constraint on (userId, name)
    ALTER TABLE tags ADD CONSTRAINT tags_userId_name_key UNIQUE ("userId", name);
    
    -- Add foreign key constraint
    ALTER TABLE tags ADD CONSTRAINT tags_userId_fkey 
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    
    -- Create index on userId
    CREATE INDEX IF NOT EXISTS tags_userId_idx ON tags("userId");
    
    --  Add userId column to positions table with default value
    ALTER TABLE positions ADD COLUMN IF NOT EXISTS "userId" TEXT;
    
    -- Set default userId for existing positions (assign to company owner)
    UPDATE positions p 
    SET "userId" = c."userId" 
    FROM companies c 
    WHERE p."companyId" = c.id AND p."userId" IS NULL;
    
    -- Make userId NOT NULL
    ALTER TABLE positions ALTER COLUMN "userId" SET NOT NULL;
    
    -- Add foreign key constraint
    ALTER TABLE positions ADD CONSTRAINT positions_userId_fkey 
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    
    -- Create index on userId
    CREATE INDEX IF NOT EXISTS positions_userId_idx ON positions("userId");
    
END $$;
