-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(60) NOT NULL,
    "entity" VARCHAR(60) NOT NULL,
    "entity_id" INTEGER,
    "detail" JSONB,
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "public"."password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "public"."password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "public"."password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "public"."audit_log"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_created_at_idx" ON "public"."audit_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "public"."audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
