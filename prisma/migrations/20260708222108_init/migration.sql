-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address" TEXT NOT NULL,
    "conservativeArv" INTEGER NOT NULL,
    "repairEstimate" INTEGER NOT NULL,
    "recommendedStrategy" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "usedMockProvider" BOOLEAN NOT NULL DEFAULT false,
    "resultJson" TEXT NOT NULL
);
