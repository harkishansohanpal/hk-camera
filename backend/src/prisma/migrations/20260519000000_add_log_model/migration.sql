-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "sessionId" TEXT,
    "userId" TEXT,
    "cameraId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Log_level_createdAt_idx" ON "Log"("level" ASC, "createdAt" ASC);
CREATE INDEX "Log_tag_createdAt_idx" ON "Log"("tag" ASC, "createdAt" ASC);
CREATE INDEX "Log_userId_idx" ON "Log"("userId" ASC);
CREATE INDEX "Log_cameraId_idx" ON "Log"("cameraId" ASC);
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt" ASC);
