-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('escrituras', 'poderes', 'testamentos', 'autenticaciones', 'actas');

-- CreateTable
CREATE TABLE "notaries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "fee" INTEGER NOT NULL,
    "availableSlots" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notaryId" INTEGER,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notaries_licenseNumber_key" ON "notaries"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "documents_code_key" ON "documents"("code");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_notaryId_fkey" FOREIGN KEY ("notaryId") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
