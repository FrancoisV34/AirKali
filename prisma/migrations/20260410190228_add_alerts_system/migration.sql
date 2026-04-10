-- AlterTable
ALTER TABLE `DonneeMeteo` ADD COLUMN `weatherCode` INTEGER NULL;

-- CreateTable
CREATE TABLE `Alert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `communeId` INTEGER NOT NULL,
    `type` ENUM('AIR', 'METEO') NOT NULL,
    `palier` ENUM('AIR_MOYEN', 'AIR_MAUVAIS', 'AIR_TRES_MAUVAIS', 'METEO_SEVERE') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `wasUnderThreshold` BOOLEAN NOT NULL DEFAULT true,
    `lastTriggeredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Alert_userId_communeId_type_key`(`userId`, `communeId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alertId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `communeId` INTEGER NOT NULL,
    `type` ENUM('AIR', 'METEO') NOT NULL,
    `palier` ENUM('AIR_MOYEN', 'AIR_MAUVAIS', 'AIR_TRES_MAUVAIS', 'METEO_SEVERE') NULL,
    `valeurMesuree` DOUBLE NOT NULL,
    `seuilDeclenche` DOUBLE NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `officielle` BOOLEAN NOT NULL DEFAULT false,
    `emailSent` BOOLEAN NOT NULL DEFAULT false,
    `notificationSent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_communeId_fkey` FOREIGN KEY (`communeId`) REFERENCES `Commune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertLog` ADD CONSTRAINT `AlertLog_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `Alert`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertLog` ADD CONSTRAINT `AlertLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertLog` ADD CONSTRAINT `AlertLog_communeId_fkey` FOREIGN KEY (`communeId`) REFERENCES `Commune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
