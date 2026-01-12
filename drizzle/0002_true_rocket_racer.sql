ALTER TABLE `articles` ADD `parentArticleId` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `pageType` enum('article','list','unknown') DEFAULT 'article';