-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('UTILISATEUR', 'ADMIN') NOT NULL DEFAULT 'UTILISATEUR',
    `adressePostale` VARCHAR(191) NULL,
    `estSuspendu` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Commune` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `codePostal` VARCHAR(191) NOT NULL,
    `codeInsee` VARCHAR(191) NOT NULL,
    `population` INTEGER NULL,
    `latitude` DECIMAL(9, 6) NOT NULL,
    `longitude` DECIMAL(9, 6) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `activatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Commune_codeInsee_key`(`codeInsee`),
    INDEX `Commune_nom_idx`(`nom`),
    INDEX `Commune_codePostal_idx`(`codePostal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DonneeAir` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communeId` INTEGER NOT NULL,
    `ozone` DOUBLE NULL,
    `co` DOUBLE NULL,
    `pm25` DOUBLE NULL,
    `pm10` DOUBLE NULL,
    `indiceQualite` INTEGER NULL,
    `dateHeure` DATETIME(3) NOT NULL,

    INDEX `DonneeAir_communeId_dateHeure_idx`(`communeId`, `dateHeure`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DonneeMeteo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communeId` INTEGER NOT NULL,
    `temperature` DOUBLE NULL,
    `pression` DOUBLE NULL,
    `humidite` DOUBLE NULL,
    `meteoCiel` VARCHAR(191) NULL,
    `vitesseVent` DOUBLE NULL,
    `dateHeure` DATETIME(3) NOT NULL,

    INDEX `DonneeMeteo_communeId_dateHeure_idx`(`communeId`, `dateHeure`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favori` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `communeId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Favori_userId_communeId_key`(`userId`, `communeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogCollecte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('AIR', 'METEO', 'POPULATION') NOT NULL,
    `statut` ENUM('SUCCESS', 'ERROR') NOT NULL,
    `communesTraitees` INTEGER NOT NULL,
    `communesErreur` INTEGER NOT NULL DEFAULT 0,
    `dureeMs` INTEGER NOT NULL,
    `dateExecution` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DonneeAir` ADD CONSTRAINT `DonneeAir_communeId_fkey` FOREIGN KEY (`communeId`) REFERENCES `Commune`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DonneeMeteo` ADD CONSTRAINT `DonneeMeteo_communeId_fkey` FOREIGN KEY (`communeId`) REFERENCES `Commune`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favori` ADD CONSTRAINT `Favori_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favori` ADD CONSTRAINT `Favori_communeId_fkey` FOREIGN KEY (`communeId`) REFERENCES `Commune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
