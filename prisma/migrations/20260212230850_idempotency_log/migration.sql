-- CreateTable
CREATE TABLE "idempotency_logs" (
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "result" TEXT,

    CONSTRAINT "idempotency_logs_pkey" PRIMARY KEY ("key")
);
