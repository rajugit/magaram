ALTER TABLE `MediaAsset`
  ADD COLUMN `width` INTEGER NULL,
  ADD COLUMN `height` INTEGER NULL,
  ADD COLUMN `sha256` CHAR(64) NULL,
  ADD COLUMN `rightsStatus` ENUM('PENDING', 'CLEARED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `rightsSource` VARCHAR(1000) NULL,
  ADD COLUMN `rightsReviewedBy` VARCHAR(191) NULL,
  ADD COLUMN `rightsReviewedAt` DATETIME(3) NULL,
  ADD INDEX `MediaAsset_rightsStatus_createdAt_idx` (`rightsStatus`, `createdAt`);
