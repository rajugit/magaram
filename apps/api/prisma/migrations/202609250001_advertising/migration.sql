-- CreateTable
CREATE TABLE `Advertiser` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `contactEmail` VARCHAR(320) NOT NULL,
    `billingAddress` VARCHAR(1000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Advertiser_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(80) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `dailyRatePaise` INTEGER NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdPlacement_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `advertiserId` VARCHAR(191) NOT NULL,
    `placementId` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(180) NOT NULL,
    `body` TEXT NOT NULL,
    `destinationUrl` VARCHAR(1000) NOT NULL,
    `rightsEvidence` VARCHAR(2000) NOT NULL,
    `disclosure` VARCHAR(100) NOT NULL DEFAULT 'விளம்பரம்',
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `submittedBy` VARCHAR(191) NULL,
    `lastEditedBy` VARCHAR(191) NOT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdCampaign_advertiserId_createdAt_idx`(`advertiserId`, `createdAt`),
    INDEX `AdCampaign_placementId_status_startsAt_endsAt_idx`(`placementId`, `status`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `amountPaise` INTEGER NOT NULL,
    `dailyRatePaise` INTEGER NOT NULL,
    `days` INTEGER NOT NULL,
    `billingSnapshot` JSON NOT NULL,
    `status` ENUM('UNPAID', 'VOID') NOT NULL DEFAULT 'UNPAID',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `voidedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AdInvoice_campaignId_key`(`campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPaymentAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(100) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'UNAVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdPaymentAttempt_invoiceId_requestKey_key`(`invoiceId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdCampaign` ADD CONSTRAINT `AdCampaign_advertiserId_fkey` FOREIGN KEY (`advertiserId`) REFERENCES `Advertiser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdCampaign` ADD CONSTRAINT `AdCampaign_placementId_fkey` FOREIGN KEY (`placementId`) REFERENCES `AdPlacement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdInvoice` ADD CONSTRAINT `AdInvoice_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `AdCampaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPaymentAttempt` ADD CONSTRAINT `AdPaymentAttempt_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `AdInvoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
