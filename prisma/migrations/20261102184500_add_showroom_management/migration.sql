-- AlterTable
ALTER TABLE `employee` ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `expense` ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `returnrequest` ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sale` ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `dealerId` VARCHAR(191) NULL,
    ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `warehouse` ADD COLUMN `showroomId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Showroom` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `dealerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Showroom_organizationId_dealerId_status_idx`(`organizationId`, `dealerId`, `status`),
    UNIQUE INDEX `Showroom_dealerId_code_key`(`dealerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShowroomSale` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `dealerId` VARCHAR(191) NOT NULL,
    `showroomId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `totalAmount` DECIMAL(18, 2) NOT NULL,
    `paidAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ShowroomSale_invoiceNumber_key`(`invoiceNumber`),
    INDEX `ShowroomSale_organizationId_dealerId_showroomId_createdAt_idx`(`organizationId`, `dealerId`, `showroomId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShowroomSaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(18, 2) NOT NULL,
    `totalAmount` DECIMAL(18, 2) NOT NULL,

    INDEX `ShowroomSaleItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShowroomPayment` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `dealerId` VARCHAR(191) NOT NULL,
    `showroomId` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `referenceNo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ShowroomPayment_organizationId_dealerId_showroomId_createdAt_idx`(`organizationId`, `dealerId`, `showroomId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Expense_showroomId_idx` ON `Expense`(`showroomId`);

-- CreateIndex
CREATE INDEX `User_dealerId_showroomId_idx` ON `User`(`dealerId`, `showroomId`);

-- CreateIndex
CREATE UNIQUE INDEX `Warehouse_showroomId_key` ON `Warehouse`(`showroomId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Showroom` ADD CONSTRAINT `Showroom_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Showroom` ADD CONSTRAINT `Showroom_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnRequest` ADD CONSTRAINT `ReturnRequest_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomSale` ADD CONSTRAINT `ShowroomSale_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomSale` ADD CONSTRAINT `ShowroomSale_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomSale` ADD CONSTRAINT `ShowroomSale_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomSaleItem` ADD CONSTRAINT `ShowroomSaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `ShowroomSale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomSaleItem` ADD CONSTRAINT `ShowroomSaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomPayment` ADD CONSTRAINT `ShowroomPayment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomPayment` ADD CONSTRAINT `ShowroomPayment_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomPayment` ADD CONSTRAINT `ShowroomPayment_showroomId_fkey` FOREIGN KEY (`showroomId`) REFERENCES `Showroom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShowroomPayment` ADD CONSTRAINT `ShowroomPayment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `ShowroomSale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `Permission` (`id`, `key`, `description`, `createdAt`, `updatedAt`)
VALUES
    ('perm-showrooms-read', 'showrooms.read', 'View assigned dealer showrooms', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('perm-showrooms-manage', 'showrooms.manage', 'Create and manage dealer showrooms', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('perm-showrooms-staff-manage', 'showrooms.staff.manage', 'Manage showroom staff accounts', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('perm-showroom-sales-create', 'showroom.sales.create', 'Record showroom retail sales and receipts', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('perm-showroom-expenses-manage', 'showroom.expenses.manage', 'Submit showroom expenses', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('perm-purchases-manage', 'purchases.manage', 'Manage purchase requisitions', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('perm-vendors-manage', 'vendors.manage', 'Manage vendors', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

INSERT INTO `Role` (`id`, `name`, `description`, `createdAt`, `updatedAt`)
VALUES ('role-dealer-admin-showrooms', 'Dealer Admin', 'Dealer administrator for all assigned showrooms', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

INSERT INTO `RolePermission` (`id`, `roleId`, `permissionId`)
SELECT CONCAT('rp-dealer-admin-', REPLACE(`Permission`.`key`, '.', '-')), `Role`.`id`, `Permission`.`id`
FROM `Role`
CROSS JOIN `Permission`
WHERE `Role`.`name` = 'Dealer Admin'
  AND `Permission`.`key` IN (
    'dealers.read',
    'showrooms.read',
    'showrooms.manage',
    'showrooms.staff.manage',
    'showroom.sales.create',
    'showroom.expenses.manage',
    'orders.create',
    'returns.create',
    'inventory.read',
    'inventory.update'
  )
ON DUPLICATE KEY UPDATE `roleId` = VALUES(`roleId`), `permissionId` = VALUES(`permissionId`);

INSERT INTO `RolePermission` (`id`, `roleId`, `permissionId`)
SELECT CONCAT('rp-showroom-staff-', REPLACE(`Permission`.`key`, '.', '-')), `Role`.`id`, `Permission`.`id`
FROM `Role`
CROSS JOIN `Permission`
WHERE `Role`.`name` = 'Showroom Staff'
  AND `Permission`.`key` IN ('dealers.read', 'showrooms.read', 'showroom.sales.create', 'orders.create', 'returns.create', 'inventory.read')
ON DUPLICATE KEY UPDATE `roleId` = VALUES(`roleId`), `permissionId` = VALUES(`permissionId`);

INSERT INTO `RolePermission` (`id`, `roleId`, `permissionId`)
SELECT CONCAT('rp-purchase-manager-', REPLACE(`Permission`.`key`, '.', '-')), `Role`.`id`, `Permission`.`id`
FROM `Role`
CROSS JOIN `Permission`
WHERE `Role`.`name` = 'Purchase Manager'
  AND `Permission`.`key` IN ('purchases.manage', 'vendors.manage')
ON DUPLICATE KEY UPDATE `roleId` = VALUES(`roleId`), `permissionId` = VALUES(`permissionId`);
