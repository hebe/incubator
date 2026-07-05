import { pgTable, text, boolean, integer, bigint, jsonb, doublePrecision } from 'drizzle-orm/pg-core';

export const trips = pgTable('trips', {
	id: text('id').primaryKey(),
	destination: text('destination').notNull(),
	startDate: text('start_date').notNull(),
	endDate: text('end_date').notNull(),
	createdAt: bigint('created_at', { mode: 'number' }).notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const bases = pgTable('bases', {
	id: text('id').primaryKey(),
	tripId: text('trip_id').notNull(),
	name: text('name').notNull(),
	colorToken: text('color_token').notNull(),
	sortOrder: integer('sort_order').notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const activities = pgTable('activities', {
	id: text('id').primaryKey(),
	tripId: text('trip_id').notNull(),
	emoji: text('emoji').notNull(),
	name: text('name').notNull(),
	category: text('category').notNull(),
	durationLabel: text('duration_label').notNull(),
	energy: text('energy').notNull(),
	weather: text('weather').notNull(),
	needsCar: boolean('needs_car').notNull(),
	reusable: boolean('reusable').notNull(),
	confirmed: boolean('confirmed').notNull().default(false),
	placeLabel: text('place_label').notNull().default(''),
	lat: doublePrecision('lat').notNull().default(0),
	lng: doublePrecision('lng').notNull().default(0),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const days = pgTable('days', {
	id: text('id').primaryKey(),
	tripId: text('trip_id').notNull(),
	date: text('date').notNull(),
	baseId: text('base_id'),
	sortOrder: integer('sort_order').notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const placements = pgTable('placements', {
	id: text('id').primaryKey(),
	tripId: text('trip_id').notNull(),
	dayId: text('day_id').notNull(),
	activityId: text('activity_id').notNull(),
	sortOrder: integer('sort_order').notNull(),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});

export const activityMeta = pgTable('activity_meta', {
	activityId: text('activity_id').primaryKey(),
	notes: text('notes').notNull().default(''),
	links: jsonb('links').notNull().default([]),
	updatedAt: bigint('updated_at', { mode: 'number' }).notNull()
});
