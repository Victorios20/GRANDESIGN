-- AlterTable
ALTER TABLE "equipes" ADD COLUMN     "cor" VARCHAR(7);

-- CreateTable
CREATE TABLE "obra_agenda_segmento" (
    "id" SERIAL NOT NULL,
    "obra_id" INTEGER NOT NULL,
    "equipe_id" INTEGER,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obra_agenda_segmento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "obra_agenda_segmento_obra_id_idx" ON "obra_agenda_segmento"("obra_id");

-- CreateIndex
CREATE INDEX "obra_agenda_segmento_equipe_id_idx" ON "obra_agenda_segmento"("equipe_id");

-- CreateIndex
CREATE INDEX "obra_agenda_segmento_inicio_fim_idx" ON "obra_agenda_segmento"("inicio", "fim");

-- AddForeignKey
ALTER TABLE "obra_agenda_segmento" ADD CONSTRAINT "obra_agenda_segmento_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obra_agenda_segmento" ADD CONSTRAINT "obra_agenda_segmento_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
