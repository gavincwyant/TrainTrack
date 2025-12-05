-- CreateTable
CREATE TABLE "blocked_times" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "day_of_week" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_settings" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "day_start_time" TEXT NOT NULL DEFAULT '06:00',
    "day_end_time" TEXT NOT NULL DEFAULT '22:00',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocked_times_workspace_id_trainer_id_idx" ON "blocked_times"("workspace_id", "trainer_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_settings_trainer_id_key" ON "trainer_settings"("trainer_id");

-- AddForeignKey
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_settings" ADD CONSTRAINT "trainer_settings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_settings" ADD CONSTRAINT "trainer_settings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
