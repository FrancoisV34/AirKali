-- AlterTable
ALTER TABLE `Comment` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'visible';

-- AlterTable
ALTER TABLE `Topic` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'visible';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `communeId` INTEGER NULL;

-- CreateTable
CREATE TABLE `SuspensionLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `adminId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `motif` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_communeId_fkey` FOREIGN KEY (`communeId`) REFERENCES `Commune`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuspensionLog` ADD CONSTRAINT `SuspensionLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuspensionLog` ADD CONSTRAINT `SuspensionLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
