ALTER TABLE `Account` ADD COLUMN `organizationId` VARCHAR(191) NULL;
UPDATE `Account`
SET `organizationId` = (SELECT `id` FROM `Organization` WHERE `slug` = 'ev-dealer-group' LIMIT 1)
WHERE `organizationId` IS NULL;
ALTER TABLE `Account` MODIFY `organizationId` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `Account_organizationId_name_key` ON `Account`(`organizationId`, `name`);
CREATE INDEX `Account_organizationId_idx` ON `Account`(`organizationId`);
ALTER TABLE `Account`
  ADD CONSTRAINT `Account_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Vendor` ADD COLUMN `organizationId` VARCHAR(191) NULL;
UPDATE `Vendor`
SET `organizationId` = (SELECT `id` FROM `Organization` WHERE `slug` = 'ev-dealer-group' LIMIT 1)
WHERE `organizationId` IS NULL;
ALTER TABLE `Vendor` MODIFY `organizationId` VARCHAR(191) NOT NULL;
CREATE INDEX `Vendor_organizationId_idx` ON `Vendor`(`organizationId`);
ALTER TABLE `Vendor`
  ADD CONSTRAINT `Vendor_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PurchaseRequisition` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `PurchaseRequisition` ADD COLUMN `vendorName` VARCHAR(191) NULL;
UPDATE `PurchaseRequisition`
SET `organizationId` = (SELECT `id` FROM `Organization` WHERE `slug` = 'ev-dealer-group' LIMIT 1)
WHERE `organizationId` IS NULL;
ALTER TABLE `PurchaseRequisition` MODIFY `organizationId` VARCHAR(191) NOT NULL;
CREATE INDEX `PurchaseRequisition_organizationId_idx` ON `PurchaseRequisition`(`organizationId`);
ALTER TABLE `PurchaseRequisition`
  ADD CONSTRAINT `PurchaseRequisition_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PurchaseOrder` ADD COLUMN `organizationId` VARCHAR(191) NULL;
UPDATE `PurchaseOrder`
SET `organizationId` = (SELECT `id` FROM `Organization` WHERE `slug` = 'ev-dealer-group' LIMIT 1)
WHERE `organizationId` IS NULL;
ALTER TABLE `PurchaseOrder` MODIFY `organizationId` VARCHAR(191) NOT NULL;
CREATE INDEX `PurchaseOrder_organizationId_idx` ON `PurchaseOrder`(`organizationId`);
ALTER TABLE `PurchaseOrder`
  ADD CONSTRAINT `PurchaseOrder_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Expense` ADD COLUMN `organizationId` VARCHAR(191) NULL;
UPDATE `Expense`
SET `organizationId` = (SELECT `id` FROM `Organization` WHERE `slug` = 'ev-dealer-group' LIMIT 1)
WHERE `organizationId` IS NULL;
ALTER TABLE `Expense` MODIFY `organizationId` VARCHAR(191) NOT NULL;
CREATE INDEX `Expense_organizationId_idx` ON `Expense`(`organizationId`);
ALTER TABLE `Expense`
  ADD CONSTRAINT `Expense_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
