-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('SHARED', 'PRIVATE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "visibility" "ProjectVisibility" NOT NULL DEFAULT 'SHARED';
