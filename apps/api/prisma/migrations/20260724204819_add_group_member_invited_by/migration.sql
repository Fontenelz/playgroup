-- AlterTable
ALTER TABLE "group_members" ADD COLUMN     "invited_by" UUID;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
