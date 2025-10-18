-- Create TeamRole enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum - Add ADMIN value if it doesn't exist
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamRole') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TeamRole')) THEN
            ALTER TYPE "TeamRole" ADD VALUE 'ADMIN';
        END IF;
    END IF;
END $$;
