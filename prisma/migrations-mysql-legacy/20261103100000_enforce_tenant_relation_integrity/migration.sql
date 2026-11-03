-- DropForeignKey
ALTER TABLE `employee` DROP FOREIGN KEY `Employee_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `expense` DROP FOREIGN KEY `Expense_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_dealerId_fkey`;

-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_saleId_fkey`;

-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `returnrequest` DROP FOREIGN KEY `ReturnRequest_dealerId_fkey`;

-- DropForeignKey
ALTER TABLE `returnrequest` DROP FOREIGN KEY `ReturnRequest_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_dealerId_fkey`;

-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `showroom` DROP FOREIGN KEY `Showroom_dealerId_fkey`;

-- DropForeignKey
ALTER TABLE `showroompayment` DROP FOREIGN KEY `ShowroomPayment_dealerId_fkey`;

-- DropForeignKey
ALTER TABLE `showroompayment` DROP FOREIGN KEY `ShowroomPayment_saleId_fkey`;

-- DropForeignKey
ALTER TABLE `showroompayment` DROP FOREIGN KEY `ShowroomPayment_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `showroomsale` DROP FOREIGN KEY `ShowroomSale_dealerId_fkey`;

-- DropForeignKey
ALTER TABLE `showroomsale` DROP FOREIGN KEY `ShowroomSale_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_dealerId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_showroomId_fkey`;

-- DropForeignKey
ALTER TABLE `warehouse` DROP FOREIGN KEY `Warehouse_showroomId_fkey`;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `returnrequest` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- Backfill tenant ownership from the existing required dealer relationship.
UPDATE `payment` AS p
JOIN `dealer` AS d ON d.`id` = p.`dealerId`
SET p.`organizationId` = d.`organizationId`;

UPDATE `returnrequest` AS r
JOIN `dealer` AS d ON d.`id` = r.`dealerId`
SET r.`organizationId` = d.`organizationId`;

ALTER TABLE `payment` MODIFY `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `returnrequest` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Dealer_id_organizationId_key` ON `Dealer`(`id`, `organizationId`);

-- CreateIndex
CREATE UNIQUE INDEX `Sale_id_dealerId_organizationId_key` ON `Sale`(`id`, `dealerId`, `organizationId`);

-- CreateIndex
CREATE UNIQUE INDEX `Showroom_id_organizationId_key` ON `Showroom`(`id`, `organizationId`);

-- CreateIndex
CREATE UNIQUE INDEX `Showroom_id_dealerId_organizationId_key` ON `Showroom`(`id`, `dealerId`, `organizationId`);

-- CreateIndex
CREATE UNIQUE INDEX `ShowroomSale_id_organizationId_dealerId_showroomId_key` ON `ShowroomSale`(`id`, `organizationId`, `dealerId`, `showroomId`);

-- CreateIndex
CREATE UNIQUE INDEX `Warehouse_showroomId_organizationId_key` ON `Warehouse`(`showroomId`, `organizationId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_showroomId_dealerId_organizationId_fkey` FOREIGN KEY (`showroomId`, `dealerId`, `organizationId`) REFERENCES `Showroom`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_showroomId_organizationId_fkey` FOREIGN KEY (`showroomId`, `organizationId`) REFERENCES `Showroom`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Showroom` ADD CONSTRAINT `Showroom_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_showroomId_organizationId_fkey` FOREIGN KEY (`showroomId`, `organizationId`) REFERENCES `Showroom`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_showroomId_dealerId_organizationId_fkey` FOREIGN KEY (`showroomId`, `dealerId`, `organizationId`) REFERENCES `Showroom`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_showroomId_dealerId_organizationId_fkey` FOREIGN KEY (`showroomId`, `dealerId`, `organizationId`) REFERENCES `Showroom`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_showroomId_dealerId_organizationId_fkey` FOREIGN KEY (`showroomId`, `dealerId`, `organizationId`) REFERENCES `Showroom`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_saleId_dealerId_organizationId_fkey` FOREIGN KEY (`saleId`, `dealerId`, `organizationId`) REFERENCES `Sale`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_showroomId_dealerId_organizationId_fkey` FOREIGN KEY (`showroomId`, `dealerId`, `organizationId`) REFERENCES `Showroom`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_showroomId_organizationId_fkey` FOREIGN KEY (`showroomId`, `organizationId`) REFERENCES `Showroom`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomSale` ADD CONSTRAINT `ShowroomSale_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomSale` ADD CONSTRAINT `ShowroomSale_showroomId_dealerId_organizationId_fkey` FOREIGN KEY (`showroomId`, `dealerId`, `organizationId`) REFERENCES `Showroom`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomPayment` ADD CONSTRAINT `ShowroomPayment_dealerId_organizationId_fkey` FOREIGN KEY (`dealerId`, `organizationId`) REFERENCES `Dealer`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomPayment` ADD CONSTRAINT `ShowroomPayment_showroomId_dealerId_organizationId_fkey` FOREIGN KEY (`showroomId`, `dealerId`, `organizationId`) REFERENCES `Showroom`(`id`, `dealerId`, `organizationId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomPayment` ADD CONSTRAINT `ShowroomPayment_saleId_organizationId_dealerId_showroomId_fkey` FOREIGN KEY (`saleId`, `organizationId`, `dealerId`, `showroomId`) REFERENCES `ShowroomSale`(`id`, `organizationId`, `dealerId`, `showroomId`) ON DELETE RESTRICT ON UPDATE CASCADE;
