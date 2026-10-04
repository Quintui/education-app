CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`node_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`lesson_id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`watched_at` integer,
	`understanding` text,
	`quiz_correct` integer,
	`quiz_total` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
