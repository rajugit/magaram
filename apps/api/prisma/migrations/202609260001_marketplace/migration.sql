-- CreateTable
CREATE TABLE `MarketplaceListing` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `category` ENUM('JOB', 'CLASSIFIED', 'PROPERTY', 'EDUCATION', 'DEAL') NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NOT NULL,
    `location` VARCHAR(120) NOT NULL,
    `priceOrSalary` VARCHAR(120) NULL,
    `contactEmail` VARCHAR(320) NOT NULL,
    `contactPhone` VARCHAR(40) NULL,
    `rightsEvidence` VARCHAR(2000) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `submittedBy` VARCHAR(191) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketplaceListing_status_category_expiresAt_idx`(`status`, `category`, `expiresAt`),
    INDEX `MarketplaceListing_ownerId_createdAt_idx`(`ownerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceReport` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketplaceReport_listingId_createdAt_idx`(`listingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MarketplaceReport` ADD CONSTRAINT `MarketplaceReport_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `MarketplaceListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
