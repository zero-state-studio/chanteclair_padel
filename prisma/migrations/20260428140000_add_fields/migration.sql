-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);
