-- CreateIndex
CREATE INDEX "RailwayInstance_userId_status_idx" ON "RailwayInstance"("userId", "status");

-- CreateIndex
CREATE INDEX "RailwayInstance_userId_createdAt_idx" ON "RailwayInstance"("userId", "createdAt");
