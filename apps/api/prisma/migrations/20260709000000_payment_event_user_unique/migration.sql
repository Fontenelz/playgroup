-- CreateIndex
CREATE UNIQUE INDEX "payments_event_id_user_id_key" ON "payments"("event_id", "user_id");
