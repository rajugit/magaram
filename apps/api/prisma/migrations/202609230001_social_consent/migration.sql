CREATE TABLE `SocialConsent` (
    `id` VARCHAR(191) NOT NULL,
    `subjectHash` CHAR(64) NOT NULL,
    `channel` ENUM('FACEBOOK', 'INSTAGRAM', 'X', 'WHATSAPP', 'TELEGRAM', 'YOUTUBE') NOT NULL,
    `purpose` VARCHAR(120) NOT NULL,
    `source` VARCHAR(500) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SocialConsent_subjectHash_channel_purpose_idx`(`subjectHash`, `channel`, `purpose`),
    INDEX `SocialConsent_revokedAt_channel_idx`(`revokedAt`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
