CREATE TABLE `AiRun` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `articleVersion` INTEGER NOT NULL,
  `requestKey` VARCHAR(64) NOT NULL,
  `task` VARCHAR(40) NOT NULL,
  `status` ENUM('RUNNING','READY','FAILED','ACCEPTED','REJECTED') NOT NULL DEFAULT 'RUNNING',
  `promptVersion` VARCHAR(80) NOT NULL,
  `inputHash` CHAR(64) NOT NULL,
  `inputSnapshot` JSON NOT NULL,
  `sourceIds` JSON NOT NULL,
  `provider` VARCHAR(100) NOT NULL,
  `model` VARCHAR(200) NOT NULL,
  `output` JSON NULL,
  `inputTokens` INTEGER NULL,
  `outputTokens` INTEGER NULL,
  `failureCode` VARCHAR(60) NULL,
  `reviewNote` TEXT NULL,
  `reviewedBy` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AiRun_actorId_requestKey_key` (`actorId`, `requestKey`),
  INDEX `AiRun_articleId_createdAt_idx` (`articleId`, `createdAt`),
  INDEX `AiRun_status_expiresAt_idx` (`status`, `expiresAt`),
  CONSTRAINT `AiRun_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `AiRun_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AiDailyUsage` (
  `scope` VARCHAR(191) NOT NULL,
  `day` CHAR(10) NOT NULL,
  `requests` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`scope`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
