-- CreateTable
CREATE TABLE `LocalBusiness` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(40) NULL,
    `website` VARCHAR(500) NULL,
    `ownerId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LocalBusiness_slug_key`(`slug`),
    INDEX `LocalBusiness_status_location_idx`(`status`, `location`),
    INDEX `LocalBusiness_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocalOffer` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NOT NULL,
    `terms` TEXT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocalOffer_businessId_status_endsAt_idx`(`businessId`, `status`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocalLead` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NULL,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `phone` VARCHAR(40) NULL,
    `message` TEXT NOT NULL,
    `consentAt` DATETIME(3) NOT NULL,
    `status` ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM') NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocalLead_businessId_status_createdAt_idx`(`businessId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LocalOffer` ADD CONSTRAINT `LocalOffer_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `LocalBusiness`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocalLead` ADD CONSTRAINT `LocalLead_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `LocalBusiness`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocalLead` ADD CONSTRAINT `LocalLead_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `LocalOffer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
