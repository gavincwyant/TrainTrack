-- AlterTable
ALTER TABLE "trainer_settings" ADD COLUMN     "auto_client_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "client_sync_lookback_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "has_completed_initial_client_sync" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_client_sync_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "pending_client_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_event_ids" TEXT[],
    "extracted_name" TEXT NOT NULL,
    "extracted_email" TEXT,
    "extracted_phone" TEXT,
    "extraction_confidence" TEXT NOT NULL,
    "extraction_reason" TEXT NOT NULL,
    "first_seen_date" TIMESTAMP(3) NOT NULL,
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_name" TEXT,
    "reviewed_email" TEXT,
    "reviewed_phone" TEXT,
    "reviewed_notes" TEXT,
    "default_billing_frequency" TEXT NOT NULL DEFAULT 'PER_SESSION',
    "default_session_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_client_profiles_created_client_id_key" ON "pending_client_profiles"("created_client_id");

-- CreateIndex
CREATE INDEX "pending_client_profiles_workspace_id_trainer_id_status_idx" ON "pending_client_profiles"("workspace_id", "trainer_id", "status");

-- CreateIndex
CREATE INDEX "pending_client_profiles_source_extracted_name_idx" ON "pending_client_profiles"("source", "extracted_name");

-- AddForeignKey
ALTER TABLE "pending_client_profiles" ADD CONSTRAINT "pending_client_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_client_profiles" ADD CONSTRAINT "pending_client_profiles_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_client_profiles" ADD CONSTRAINT "pending_client_profiles_created_client_id_fkey" FOREIGN KEY ("created_client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
