-- AlterTable
ALTER TABLE "public"."orcamento" ALTER COLUMN "data_ultima_alteracao" SET DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'::text);
