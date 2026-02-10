-- AlterTable
ALTER TABLE "obra_agenda_segmento" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'AGENDADO',
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'EXECUCAO',
ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "obras" ADD COLUMN     "data_contrato" TIMESTAMP(6),
ADD COLUMN     "data_fim_obra" DATE,
ADD COLUMN     "data_inicio_obra" DATE,
ADD COLUMN     "link_contrato_assinado" VARCHAR(255);

-- CreateTable
CREATE TABLE "obra_documentos" (
    "id" SERIAL NOT NULL,
    "obra_id" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "url" VARCHAR(500),
    "link" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obra_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "obra_documentos_obra_id_idx" ON "obra_documentos"("obra_id");

-- CreateIndex
CREATE INDEX "obra_documentos_obra_id_tipo_idx" ON "obra_documentos"("obra_id", "tipo");

-- AddForeignKey
ALTER TABLE "obra_documentos" ADD CONSTRAINT "obra_documentos_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
