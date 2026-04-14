-- AlterTable
ALTER TABLE "pedido_compra" ADD COLUMN     "motivo_extra" TEXT,
ADD COLUMN     "nao_previsto" BOOLEAN NOT NULL DEFAULT false;
