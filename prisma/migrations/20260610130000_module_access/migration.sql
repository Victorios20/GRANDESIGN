-- CreateEnum
CREATE TYPE "ModuleAccessEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "role_module_access" (
    "role_id" INTEGER NOT NULL,
    "module_key" VARCHAR(60) NOT NULL,

    CONSTRAINT "role_module_access_pkey" PRIMARY KEY ("role_id","module_key")
);

-- CreateTable
CREATE TABLE "user_module_access" (
    "user_id" INTEGER NOT NULL,
    "module_key" VARCHAR(60) NOT NULL,
    "effect" "ModuleAccessEffect" NOT NULL,

    CONSTRAINT "user_module_access_pkey" PRIMARY KEY ("user_id","module_key")
);

-- CreateIndex
CREATE INDEX "role_module_access_role_id_idx" ON "role_module_access"("role_id");

-- CreateIndex
CREATE INDEX "role_module_access_module_key_idx" ON "role_module_access"("module_key");

-- CreateIndex
CREATE INDEX "user_module_access_user_id_idx" ON "user_module_access"("user_id");

-- CreateIndex
CREATE INDEX "user_module_access_module_key_idx" ON "user_module_access"("module_key");

-- AddForeignKey
ALTER TABLE "role_module_access" ADD CONSTRAINT "role_module_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_access" ADD CONSTRAINT "user_module_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
