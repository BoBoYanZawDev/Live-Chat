-- Keep the latest reaction for each actor on each message.
DELETE older FROM `Reaction` older
INNER JOIN `Reaction` newer
  ON older.`messageId` = newer.`messageId`
  AND older.`actorType` = newer.`actorType`
  AND older.`actorId` = newer.`actorId`
  AND (older.`createdAt` < newer.`createdAt`
    OR (older.`createdAt` = newer.`createdAt` AND older.`id` < newer.`id`));

-- Add the replacement index before dropping the index used by the foreign key.
CREATE UNIQUE INDEX `Reaction_messageId_actorType_actorId_key`
  ON `Reaction` (`messageId`, `actorType`, `actorId`);
DROP INDEX `Reaction_messageId_actorType_actorId_emoji_key` ON `Reaction`;
