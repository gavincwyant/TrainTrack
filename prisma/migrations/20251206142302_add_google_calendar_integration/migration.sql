-- AlterTable
ALTER TABLE "trainer_settings" ADD COLUMN     "auto_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "google_access_token" TEXT,
ADD COLUMN     "google_calendar_connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "google_calendar_email" TEXT,
ADD COLUMN     "google_calendar_id" TEXT,
ADD COLUMN     "google_refresh_token" TEXT,
ADD COLUMN     "last_synced_at" TIMESTAMP(3),
ADD COLUMN     "sync_direction" TEXT NOT NULL DEFAULT 'bidirectional';

-- CreateTable
CREATE TABLE "calendar_event_mappings" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "blocked_time_id" TEXT,
    "provider" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "external_calendar_id" TEXT NOT NULL,
    "sync_direction" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_event_mappings_appointment_id_idx" ON "calendar_event_mappings"("appointment_id");

-- CreateIndex
CREATE INDEX "calendar_event_mappings_blocked_time_id_idx" ON "calendar_event_mappings"("blocked_time_id");

-- CreateIndex
CREATE INDEX "calendar_event_mappings_workspace_id_idx" ON "calendar_event_mappings"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_mappings_provider_external_event_id_key" ON "calendar_event_mappings"("provider", "external_event_id");

-- AddForeignKey
ALTER TABLE "calendar_event_mappings" ADD CONSTRAINT "calendar_event_mappings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_mappings" ADD CONSTRAINT "calendar_event_mappings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_mappings" ADD CONSTRAINT "calendar_event_mappings_blocked_time_id_fkey" FOREIGN KEY ("blocked_time_id") REFERENCES "blocked_times"("id") ON DELETE CASCADE ON UPDATE CASCADE;
