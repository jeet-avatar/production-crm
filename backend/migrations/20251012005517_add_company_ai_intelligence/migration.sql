-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "aiCompanyType" TEXT,
ADD COLUMN     "aiDescription" TEXT,
ADD COLUMN     "aiEmployeeRange" TEXT,
ADD COLUMN     "aiFoundedYear" INTEGER,
ADD COLUMN     "aiIndustry" TEXT,
ADD COLUMN     "aiKeywords" TEXT[],
ADD COLUMN     "aiRecentNews" TEXT,
ADD COLUMN     "aiRevenue" TEXT,
ADD COLUMN     "aiTechStack" TEXT[],
ADD COLUMN     "enrichmentStatus" TEXT DEFAULT 'pending';

