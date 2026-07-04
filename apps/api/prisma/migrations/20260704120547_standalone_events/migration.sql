-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('link_only', 'public');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "visibility" "EventVisibility",
ALTER COLUMN "group_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "events_visibility_starts_at_idx" ON "events"("visibility", "starts_at");

-- CheckConstraint: an event is either a group event (group_id set, visibility null)
-- or a standalone event (group_id null, visibility + created_by set)
ALTER TABLE "events" ADD CONSTRAINT "events_group_or_standalone_chk" CHECK (
  (group_id IS NOT NULL AND visibility IS NULL)
  OR
  (group_id IS NULL AND visibility IS NOT NULL AND created_by IS NOT NULL)
);

