-- AlterTable Topic: add status and isClosed
ALTER TABLE `Topic` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'visible';
ALTER TABLE `Topic` ADD COLUMN `isClosed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Comment: add status
ALTER TABLE `Comment` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'visible';

-- CreateTable Notification
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `reason` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
