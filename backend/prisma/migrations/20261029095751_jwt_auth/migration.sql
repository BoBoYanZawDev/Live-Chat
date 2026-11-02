-- DropForeignKey
ALTER TABLE `CustomerSession` DROP FOREIGN KEY `CustomerSession_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `OperatorSession` DROP FOREIGN KEY `OperatorSession_operatorId_fkey`;

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Operator` ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `CustomerSession`;

-- DropTable
DROP TABLE `OperatorSession`;

