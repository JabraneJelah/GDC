-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_nom_key" ON "services"("nom");

-- Insert default service
INSERT INTO "services" ("nom") VALUES ('Service Général') RETURNING "id";

-- Add nullable column first
ALTER TABLE "professeurs" ADD COLUMN "service_id" INTEGER;

-- Update all existing professeurs with the default service
UPDATE "professeurs" SET "service_id" = (SELECT "id" FROM "services" WHERE "nom" = 'Service Général' LIMIT 1);

-- Make the column required
ALTER TABLE "professeurs" ALTER COLUMN "service_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "professeurs" ADD CONSTRAINT "professeurs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
