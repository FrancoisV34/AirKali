-- CreateTable
CREATE TABLE `ManualAlert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communeId` INTEGER NOT NULL,
    `palier` ENUM('AIR_MOYEN', 'AIR_MAUVAIS', 'AIR_TRES_MAUVAIS', 'METEO_SEVERE') NOT NULL,
    `message` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ManualAlert_communeId_idx`(`communeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ManualAlert` ADD CONSTRAINT `ManualAlert_communeId_fkey` FOREIGN KEY (`communeId`) REFERENCES `Commune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManualAlert` ADD CONSTRAINT `ManualAlert_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
