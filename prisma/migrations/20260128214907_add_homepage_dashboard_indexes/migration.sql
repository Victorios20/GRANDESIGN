-- CreateIndex
CREATE INDEX "idx_obras_data_criacao" ON "obras"("data_criacao" DESC);

-- CreateIndex
CREATE INDEX "idx_obras_status" ON "obras"("status");

-- CreateIndex
CREATE INDEX "idx_obras_status_data_criacao" ON "obras"("status", "data_criacao" DESC);

-- CreateIndex
CREATE INDEX "idx_orcamento_excluido_data_criacao" ON "orcamento"("excluido", "data_criacao" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_compra_status" ON "pedido_compra"("status");

-- CreateIndex
CREATE INDEX "idx_pedido_compra_status_created_at" ON "pedido_compra"("status", "created_at" DESC);
