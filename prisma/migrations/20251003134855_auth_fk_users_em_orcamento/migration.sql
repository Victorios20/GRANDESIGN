-- AlterTable
ALTER TABLE "public"."orcamento" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "updated_by" INTEGER;

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "public"."user_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_orcamento_created_by" ON "public"."orcamento"("created_by");

-- CreateIndex
CREATE INDEX "idx_orcamento_updated_by" ON "public"."orcamento"("updated_by");

-- AddForeignKey
ALTER TABLE "public"."orcamento" ADD CONSTRAINT "orcamento_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orcamento" ADD CONSTRAINT "orcamento_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
