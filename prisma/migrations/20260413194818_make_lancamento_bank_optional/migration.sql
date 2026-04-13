-- DropForeignKey
ALTER TABLE "lancamentos" DROP CONSTRAINT "lancamentos_conta_bancaria_id_fkey";

-- AlterTable
ALTER TABLE "lancamentos" ALTER COLUMN "conta_bancaria_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "contas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
