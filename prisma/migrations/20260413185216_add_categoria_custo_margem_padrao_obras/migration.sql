-- AlterEnum
ALTER TYPE "TipoCategoria" ADD VALUE 'Custo';

-- AlterTable
ALTER TABLE "fluxo_caixa_parametros" ADD COLUMN     "margem_padrao_obras" DECIMAL(5,2) NOT NULL DEFAULT 15.00;
