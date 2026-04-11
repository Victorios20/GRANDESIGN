CREATE TABLE "fluxo_caixa_parametros" (
    "id" INTEGER NOT NULL,
    "limite_alerta" DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxo_caixa_parametros_pkey" PRIMARY KEY ("id")
);
