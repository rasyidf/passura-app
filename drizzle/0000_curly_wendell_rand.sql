CREATE TABLE `animal_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`breed` text NOT NULL,
	`genetic_line` text,
	`quality` text NOT NULL,
	`price` real NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`region` text,
	`lineage_head` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `elders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`clan` text,
	`role` text DEFAULT 'validator' NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `elders_email_unique` ON `elders` (`email`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`event_name` text,
	`description` text,
	`members` text DEFAULT '[]' NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `handovers` (
	`id` text PRIMARY KEY NOT NULL,
	`group` text,
	`from_clan` text NOT NULL,
	`to_clan` text NOT NULL,
	`obligation_type` text DEFAULT 'ritual' NOT NULL,
	`asset_type` text NOT NULL,
	`animal_type` text,
	`quantity` real,
	`money_amount` real,
	`date` text NOT NULL,
	`witnesses` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`calculated_value` real,
	`summary` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`group` text,
	`lender` text NOT NULL,
	`borrower` text NOT NULL,
	`loan_type` text NOT NULL,
	`animal_type` text,
	`money_amount` real,
	`quantity` real,
	`event` text NOT NULL,
	`date_issued` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`witnesses` text DEFAULT '[]' NOT NULL,
	`repayments` text DEFAULT '[]' NOT NULL,
	`calculated_principal_value` real,
	`remaining_value` real,
	`notes` text,
	`summary` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `obligations` (
	`id` text PRIMARY KEY NOT NULL,
	`giver` text NOT NULL,
	`receiver` text NOT NULL,
	`payment_type` text NOT NULL,
	`animal_type` text,
	`money_amount` real,
	`quantity` real NOT NULL,
	`event` text NOT NULL,
	`date` text NOT NULL,
	`witnesses` text DEFAULT '[]' NOT NULL,
	`calculated_value` real,
	`summary` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`clan` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`next` text,
	`notes` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`group` text,
	`receiver` text NOT NULL,
	`giver` text NOT NULL,
	`obligation_type` text DEFAULT 'ritual' NOT NULL,
	`asset_type` text NOT NULL,
	`animal_type` text,
	`quantity` real,
	`money_amount` real,
	`date_received` text NOT NULL,
	`settlement_status` text DEFAULT 'pending' NOT NULL,
	`witnesses` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`calculated_value` real,
	`summary` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`device_id` text,
	`created_at` integer NOT NULL
);
