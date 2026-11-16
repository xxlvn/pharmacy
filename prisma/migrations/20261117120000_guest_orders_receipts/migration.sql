-- Восстановление пароля по почте убрано
DROP INDEX "users_reset_token_hash_key";
ALTER TABLE "users" DROP COLUMN "reset_token_expires",
DROP COLUMN "reset_token_hash";

-- Заказы без регистрации: пользователь необязателен, почта покупателя обязательна
ALTER TABLE "orders" ADD COLUMN "access_hash" TEXT,
ADD COLUMN "email" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- Для существующих заказов почта берётся из аккаунта покупателя
UPDATE "orders" o SET "email" = u."email" FROM "users" u WHERE o."user_id" = u."id";
ALTER TABLE "orders" ALTER COLUMN "email" SET NOT NULL;

CREATE UNIQUE INDEX "orders_access_hash_key" ON "orders"("access_hash");
