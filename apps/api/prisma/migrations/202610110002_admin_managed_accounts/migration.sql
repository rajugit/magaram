ALTER TABLE `User`
  ADD COLUMN `username` varchar(80) NULL,
  ADD COLUMN `mustChangePassword` boolean NOT NULL DEFAULT false,
  ADD UNIQUE KEY `User_username_key` (`username`);

UPDATE `User`
SET `username` = 'magarammedia'
WHERE `email` = 'admin@magarammedia.in' AND `username` IS NULL;
