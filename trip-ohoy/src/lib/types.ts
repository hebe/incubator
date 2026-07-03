// Domain types for trip-ohoy. These mirror the Neon/Drizzle schema (M3) and the
// Dexie tables (see lib/data/local.ts) one-to-one, so the local store and the
// eventual sync layer share shapes.

export type CategoryKey = 'water' | 'nature' | 'sight' | 'rest' | 'food' | 'shop';
export type Energy = 'Low' | 'Medium' | 'High';
export type Weather = 'good' | 'rainy' | 'any';

export interface Trip {
	id: string;
	destination: string;
	startDate: string; // ISO yyyy-mm-dd
	endDate: string; // ISO yyyy-mm-dd
	createdAt: number;
	updatedAt: number;
}

export interface Base {
	id: string;
	tripId: string;
	name: string;
	colorToken: string; // key into BASE_PALETTE (see catalog.ts)
	sortOrder: number;
	updatedAt: number;
}

export interface Activity {
	id: string;
	tripId: string;
	emoji: string;
	name: string;
	category: CategoryKey;
	durationLabel: string; // e.g. "Full day", "2 hours"
	energy: Energy;
	weather: Weather;
	needsCar: boolean;
	reusable: boolean;
	placeLabel: string;
	lat: number;
	lng: number;
	updatedAt: number;
}

export interface Day {
	id: string;
	tripId: string;
	date: string; // ISO yyyy-mm-dd
	baseId: string | null;
	sortOrder: number;
	updatedAt: number;
}

export interface Placement {
	id: string;
	tripId: string;
	dayId: string;
	activityId: string;
	sortOrder: number;
	updatedAt: number;
}

export interface Link {
	label: string;
	url: string;
}

export interface ActivityMeta {
	activityId: string;
	notes: string;
	links: Link[];
	updatedAt: number;
}

export type Mood = 'Active day' | 'Balanced day' | 'Calm day';
