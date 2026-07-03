// Dexie (IndexedDB) is the local source of truth for the UI. Every mutation writes here
// immediately so state survives reloads offline. The table shapes match lib/types.ts, so
// the M3 sync layer can push/pull records without reshaping.

import Dexie, { type Table } from 'dexie';
import type { Activity, ActivityMeta, Base, Day, Placement, Trip } from '$lib/types';
import {
	SEED_ACTIVITIES,
	SEED_BASES,
	SEED_DAY_BASES,
	SEED_PLACEMENTS,
	SEED_TRIP
} from './catalog';
import { datesInRange } from './derive';

export class TripOhoyDB extends Dexie {
	trips!: Table<Trip, string>;
	bases!: Table<Base, string>;
	activities!: Table<Activity, string>;
	days!: Table<Day, string>;
	placements!: Table<Placement, string>;
	activityMeta!: Table<ActivityMeta, string>;

	constructor() {
		super('trip-ohoy');
		this.version(1).stores({
			trips: 'id, updatedAt',
			bases: 'id, tripId, updatedAt',
			activities: 'id, tripId, updatedAt',
			days: 'id, tripId, updatedAt',
			placements: 'id, tripId, dayId, activityId, updatedAt',
			activityMeta: 'activityId, updatedAt'
		});
	}
}

export const db = new TripOhoyDB();

export function uid(): string {
	return crypto.randomUUID();
}

// Everything needed to render one trip's planner.
export interface TripGraph {
	trip: Trip;
	bases: Base[];
	activities: Activity[];
	days: Day[];
	placements: Placement[];
	meta: Record<string, ActivityMeta>;
}

export async function loadTripGraph(tripId: string): Promise<TripGraph | null> {
	const trip = await db.trips.get(tripId);
	if (!trip) return null;
	const [bases, activities, days, placements, metaRows] = await Promise.all([
		db.bases.where('tripId').equals(tripId).toArray(),
		db.activities.where('tripId').equals(tripId).toArray(),
		db.days.where('tripId').equals(tripId).toArray(),
		db.placements.where('tripId').equals(tripId).toArray(),
		db.activityMeta.toArray()
	]);
	const activityIds = new Set(activities.map((a) => a.id));
	const meta: Record<string, ActivityMeta> = {};
	for (const m of metaRows) if (activityIds.has(m.activityId)) meta[m.activityId] = m;
	bases.sort((a, b) => a.sortOrder - b.sortOrder);
	days.sort((a, b) => a.sortOrder - b.sortOrder);
	return { trip, bases, activities, days, placements, meta };
}

// Seed the Mauritius trip on first run (M1 has no trip-creation UI yet).
export async function seedIfEmpty(): Promise<string> {
	const existing = await db.trips.get(SEED_TRIP.id);
	if (existing) return SEED_TRIP.id;

	const now = Date.now();
	const tripId = SEED_TRIP.id;

	const trip: Trip = { ...SEED_TRIP, createdAt: now, updatedAt: now };

	const baseIdByToken: Record<string, string> = {};
	const bases: Base[] = SEED_BASES.map((b, i) => {
		const id = uid();
		baseIdByToken[b.colorToken] = id;
		return { id, tripId, name: b.name, colorToken: b.colorToken, sortOrder: i, updatedAt: now };
	});

	const activities: Activity[] = SEED_ACTIVITIES.map((a) => ({ ...a, tripId, updatedAt: now }));

	const isoDates = datesInRange(trip.startDate, trip.endDate);
	const days: Day[] = isoDates.map((date, i) => ({
		id: uid(),
		tripId,
		date,
		baseId: baseIdByToken[SEED_DAY_BASES[i]] ?? bases[0].id,
		sortOrder: i,
		updatedAt: now
	}));

	const placements: Placement[] = [];
	for (const [dayIdxStr, ids] of Object.entries(SEED_PLACEMENTS)) {
		const day = days[Number(dayIdxStr)];
		ids.forEach((activityId, sortOrder) => {
			placements.push({ id: uid(), tripId, dayId: day.id, activityId, sortOrder, updatedAt: now });
		});
	}

	await db.transaction('rw', db.trips, db.bases, db.activities, db.days, db.placements, async () => {
		await db.trips.put(trip);
		await db.bases.bulkPut(bases);
		await db.activities.bulkPut(activities);
		await db.days.bulkPut(days);
		await db.placements.bulkPut(placements);
	});

	return tripId;
}
