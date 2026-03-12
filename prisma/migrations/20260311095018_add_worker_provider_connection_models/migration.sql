-- CreateTable
CREATE TABLE "WorkerProvider" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "WorkerProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProvider_workerId_providerId_key" ON "WorkerProvider"("workerId", "providerId");

-- AddForeignKey
ALTER TABLE "WorkerProvider" ADD CONSTRAINT "WorkerProvider_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerProvider" ADD CONSTRAINT "WorkerProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
