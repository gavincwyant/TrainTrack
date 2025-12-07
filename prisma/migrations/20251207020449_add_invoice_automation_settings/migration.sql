-- AlterTable
ALTER TABLE "client_profiles" ADD COLUMN     "auto_invoice_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "trainer_settings" ADD COLUMN     "auto_invoicing_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "default_invoice_due_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "monthly_invoice_day" INTEGER NOT NULL DEFAULT 1;
