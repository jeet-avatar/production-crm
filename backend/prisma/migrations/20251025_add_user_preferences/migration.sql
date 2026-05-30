-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_notifications" BOOLEAN DEFAULT true,
ADD COLUMN     "deal_updates" BOOLEAN DEFAULT true,
ADD COLUMN     "new_contacts" BOOLEAN DEFAULT false,
ADD COLUMN     "weekly_report" BOOLEAN DEFAULT true,
ADD COLUMN     "marketing_emails" BOOLEAN DEFAULT false,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "date_format" TEXT DEFAULT 'MM/DD/YYYY',
ADD COLUMN     "time_format" TEXT DEFAULT '12h',
ADD COLUMN     "theme" TEXT DEFAULT 'light',
ADD COLUMN     "compact_view" BOOLEAN DEFAULT false;
