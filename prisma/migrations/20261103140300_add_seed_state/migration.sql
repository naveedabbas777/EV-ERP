CREATE TABLE "SeedState" (
    "key" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedState_pkey" PRIMARY KEY ("key")
);
