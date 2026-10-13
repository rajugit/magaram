CREATE TABLE `NewsTopicCluster` (
  `id` varchar(191) NOT NULL,
  `canonicalTopic` varchar(500) NOT NULL,
  `geography` enum('WORLD','INDIA','TAMIL_NADU','CHENNAI','DISTRICT') NOT NULL,
  `category` varchar(100) NOT NULL,
  `firstDetectedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `latestUpdateAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `trendScore` double NOT NULL DEFAULT 0,
  `verificationStatus` enum('DISCOVERED','PENDING_VERIFICATION','VERIFIED','NEEDS_REVIEW','REJECTED') NOT NULL DEFAULT 'DISCOVERED',
  `publicationStatus` varchar(32) NOT NULL DEFAULT 'UNPUBLISHED',
  PRIMARY KEY (`id`),
  KEY `NewsTopicCluster_geography_trendScore_idx` (`geography`,`trendScore`),
  KEY `NewsTopicCluster_verificationStatus_latestUpdateAt_idx` (`verificationStatus`,`latestUpdateAt`),
  KEY `NewsTopicCluster_category_latestUpdateAt_idx` (`category`,`latestUpdateAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DiscoveredNews`
  ADD COLUMN `clusterId` varchar(191) NULL,
  ADD KEY `DiscoveredNews_clusterId_idx` (`clusterId`),
  ADD CONSTRAINT `DiscoveredNews_clusterId_fkey` FOREIGN KEY (`clusterId`) REFERENCES `NewsTopicCluster`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
