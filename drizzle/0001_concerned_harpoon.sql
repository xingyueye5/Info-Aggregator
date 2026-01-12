CREATE TABLE `ai_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`summary` text,
	`keyPoints` text,
	`tags` text,
	`topic` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_analysis_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_analysis_articleId_unique` UNIQUE(`articleId`)
);
--> statement-breakpoint
CREATE TABLE `article_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_article_tag` UNIQUE(`articleId`,`tagId`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`author` varchar(255),
	`originalUrl` text NOT NULL,
	`contentText` text NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`publishedAt` timestamp,
	`crawledAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('unread','read','archived') NOT NULL DEFAULT 'unread',
	`isFavorite` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crawl_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`status` enum('success','failed','partial') NOT NULL,
	`articlesFound` int NOT NULL DEFAULT 0,
	`articlesAdded` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crawl_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`aiEnabled` boolean NOT NULL DEFAULT true,
	`aiSummaryEnabled` boolean NOT NULL DEFAULT true,
	`aiKeywordsEnabled` boolean NOT NULL DEFAULT true,
	`aiTopicEnabled` boolean NOT NULL DEFAULT true,
	`defaultCrawlInterval` int NOT NULL DEFAULT 3600,
	`notificationEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('wechat','zhihu','website','rss') NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastCrawledAt` timestamp,
	`crawlInterval` int DEFAULT 3600,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_tag` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `articleId_idx` ON `ai_analysis` (`articleId`);--> statement-breakpoint
CREATE INDEX `topic_idx` ON `ai_analysis` (`topic`);--> statement-breakpoint
CREATE INDEX `articleId_idx` ON `article_tags` (`articleId`);--> statement-breakpoint
CREATE INDEX `tagId_idx` ON `article_tags` (`tagId`);--> statement-breakpoint
CREATE INDEX `sourceId_idx` ON `articles` (`sourceId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `articles` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `articles` (`status`);--> statement-breakpoint
CREATE INDEX `crawledAt_idx` ON `articles` (`crawledAt`);--> statement-breakpoint
CREATE INDEX `contentHash_idx` ON `articles` (`contentHash`);--> statement-breakpoint
CREATE INDEX `favorite_idx` ON `articles` (`isFavorite`);--> statement-breakpoint
CREATE INDEX `sourceId_idx` ON `crawl_logs` (`sourceId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `crawl_logs` (`status`);--> statement-breakpoint
CREATE INDEX `startedAt_idx` ON `crawl_logs` (`startedAt`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `sources` (`userId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `tags` (`userId`);