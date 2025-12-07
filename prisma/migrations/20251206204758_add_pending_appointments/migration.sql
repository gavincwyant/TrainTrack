-- CreateTable
CREATE TABLE "pending_appointments" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "external_event_title" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "suggested_client_id" TEXT,
    "match_confidence" TEXT NOT NULL,
    "match_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_appointments_created_appointment_id_key" ON "pending_appointments"("created_appointment_id");

-- CreateIndex
CREATE INDEX "pending_appointments_workspace_id_trainer_id_status_idx" ON "pending_appointments"("workspace_id", "trainer_id", "status");

-- AddForeignKey
ALTER TABLE "pending_appointments" ADD CONSTRAINT "pending_appointments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_appointments" ADD CONSTRAINT "pending_appointments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_appointments" ADD CONSTRAINT "pending_appointments_suggested_client_id_fkey" FOREIGN KEY ("suggested_client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_appointments" ADD CONSTRAINT "pending_appointments_created_appointment_id_fkey" FOREIGN KEY ("created_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
