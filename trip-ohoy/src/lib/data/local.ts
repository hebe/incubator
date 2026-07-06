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

// Tombstones (deletedAt set) stay in Dexie so deletions propagate through sync, but they
// must never surface in the UI. `live` filters them out at read time.
function live<T extends { deletedAt?: number }>(rows: T[]): T[] {
	return rows.filter((r) => !r.deletedAt);
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
	if (!trip || trip.deletedAt) return null;
	const [basesRaw, activitiesRaw, daysRaw, placementsRaw, metaRaw] = await Promise.all([
		db.bases.where('tripId').equals(tripId).toArray(),
		db.activities.where('tripId').equals(tripId).toArray(),
		db.days.where('tripId').equals(tripId).toArray(),
		db.placements.where('tripId').equals(tripId).toArray(),
		db.activityMeta.toArray()
	]);
	const bases = live(basesRaw);
	const activities = live(activitiesRaw);
	const days = live(daysRaw);
	const placements = live(placementsRaw);
	const activityIds = new Set(activities.map((a) => a.id));
	const meta: Record<string, ActivityMeta> = {};
	for (const m of live(metaRaw)) if (activityIds.has(m.activityId)) meta[m.activityId] = m;
	bases.sort((a, b) => a.sortOrder - b.sortOrder);
	days.sort((a, b) => a.sortOrder - b.sortOrder);
	return { trip, bases, activities, days, placements, meta };
}

// ── Trip CRUD ──────────────────────────────────────────────────────────────

export async function createTripWithDays(
	destination: string,
	startDate: string,
	endDate: string,
	baseDefs: Array<{ name: string; colorToken: string }>
): Promise<Trip> {
	const now = Date.now();
	const id = uid();
	const trip: Trip = { id, destination, startDate, endDate, createdAt: now, updatedAt: now };
	const bases: Base[] = baseDefs.map((b, i) => ({
		id: uid(),
		tripId: id,
		name: b.name,
		colorToken: b.colorToken,
		sortOrder: i,
		updatedAt: now
	}));
	const firstBaseId = bases[0]?.id ?? null;
	const days: Day[] = datesInRange(startDate, endDate).map((date, i) => ({
		id: uid(),
		tripId: id,
		date,
		baseId: firstBaseId,
		sortOrder: i,
		updatedAt: now
	}));
	await db.transaction('rw', db.trips, db.bases, db.days, async () => {
		await db.trips.put(trip);
		await db.bases.bulkPut(bases);
		await db.days.bulkPut(days);
	});
	return trip;
}

// Edit a trip's destination/dates. Changing the range reconciles Day rows: days now
// outside the range (and their placements) are soft-deleted, missing days are added, and
// surviving days keep their base + placements. sortOrder is renumbered chronologically.
export async function updateTripDetails(
	id: string,
	patch: { destination: string; startDate: string; endDate: string }
): Promise<Trip | null> {
	const existing = await db.trips.get(id);
	if (!existing) return null;
	const now = Date.now();
	const updated: Trip = { ...existing, ...patch, updatedAt: now };

	const desiredDates = datesInRange(patch.startDate, patch.endDate);
	const desiredSet = new Set(desiredDates);
	const existingDays = live(await db.days.where('tripId').equals(id).toArray());
	const existingByDate = new Map(existingDays.map((d) => [d.date, d]));

	// Days now outside the range → tombstone them and their placements.
	const removedDayIds = existingDays.filter((d) => !desiredSet.has(d.date)).map((d) => d.id);
	const removedPlacements = removedDayIds.length
		? live(await db.placements.where('dayId').anyOf(removedDayIds).toArray())
		: [];
	const tombstonedDays: Day[] = existingDays
		.filter((d) => !desiredSet.has(d.date))
		.map((d) => ({ ...d, updatedAt: now, deletedAt: now }));
	const tombstonedPlacements: Placement[] = removedPlacements.map((p) => ({
		...p,
		updatedAt: now,
		deletedAt: now
	}));

	const bases = live(await db.bases.where('tripId').equals(id).toArray());
	bases.sort((a, b) => a.sortOrder - b.sortOrder);
	const firstBaseId = bases[0]?.id ?? null;

	// Surviving + new days in chronological order — reuse existing rows, create the rest.
	const finalDays: Day[] = desiredDates.map((date, i) => {
		const ex = existingByDate.get(date);
		return ex
			? { ...ex, sortOrder: i, updatedAt: now }
			: { id: uid(), tripId: id, date, baseId: firstBaseId, sortOrder: i, updatedAt: now };
	});

	await db.transaction('rw', db.trips, db.days, db.placements, async () => {
		await db.trips.put(updated);
		if (tombstonedDays.length) await db.days.bulkPut(tombstonedDays);
		if (tombstonedPlacements.length) await db.placements.bulkPut(tombstonedPlacements);
		if (finalDays.length) await db.days.bulkPut(finalDays);
	});
	return updated;
}

export async function deleteTrip(tripId: string): Promise<void> {
	const now = Date.now();
	const tomb = <T extends { updatedAt: number; deletedAt?: number }>(r: T): T => ({
		...r,
		updatedAt: now,
		deletedAt: now
	});
	const [trip, tripBases, tripActivities, tripDays, tripPlacements] = await Promise.all([
		db.trips.get(tripId),
		db.bases.where('tripId').equals(tripId).toArray(),
		db.activities.where('tripId').equals(tripId).toArray(),
		db.days.where('tripId').equals(tripId).toArray(),
		db.placements.where('tripId').equals(tripId).toArray()
	]);
	const activityIds = tripActivities.map((a) => a.id);
	const metaRows = activityIds.length
		? await db.activityMeta.where('activityId').anyOf(activityIds).toArray()
		: [];
	await db.transaction(
		'rw',
		[db.trips, db.bases, db.activities, db.days, db.placements, db.activityMeta],
		async () => {
			if (trip) await db.trips.put(tomb(trip));
			await db.bases.bulkPut(tripBases.map(tomb));
			await db.activities.bulkPut(tripActivities.map(tomb));
			await db.days.bulkPut(tripDays.map(tomb));
			await db.placements.bulkPut(tripPlacements.map(tomb));
			await db.activityMeta.bulkPut(metaRows.map(tomb));
		}
	);
}

// ── Activity CRUD ──────────────────────────────────────────────────────────

export async function createActivity(
	tripId: string,
	data: Omit<Activity, 'id' | 'tripId' | 'updatedAt'>
): Promise<Activity> {
	const a: Activity = { id: uid(), tripId, ...data, updatedAt: Date.now() };
	await db.activities.put(a);
	return a;
}

export async function updateActivity(
	id: string,
	patch: Partial<Omit<Activity, 'id' | 'tripId' | 'updatedAt'>>
): Promise<Activity | null> {
	const existing = await db.activities.get(id);
	if (!existing) return null;
	const updated: Activity = { ...existing, ...patch, updatedAt: Date.now() };
	await db.activities.put(updated);
	return updated;
}

export async function deleteActivity(id: string): Promise<void> {
	const now = Date.now();
	const [activity, placements, meta] = await Promise.all([
		db.activities.get(id),
		db.placements.where('activityId').equals(id).toArray(),
		db.activityMeta.get(id)
	]);
	await db.transaction('rw', db.activities, db.placements, db.activityMeta, async () => {
		if (activity) await db.activities.put({ ...activity, updatedAt: now, deletedAt: now });
		if (placements.length)
			await db.placements.bulkPut(placements.map((p) => ({ ...p, updatedAt: now, deletedAt: now })));
		if (meta) await db.activityMeta.put({ ...meta, updatedAt: now, deletedAt: now });
	});
}

// ── Base CRUD ──────────────────────────────────────────────────────────────

export async function addBase(
	tripId: string,
	name: string,
	colorToken: string
): Promise<Base> {
	const existing = await db.bases.where('tripId').equals(tripId).toArray();
	const base: Base = {
		id: uid(),
		tripId,
		name,
		colorToken,
		sortOrder: existing.length,
		updatedAt: Date.now()
	};
	await db.bases.put(base);
	return base;
}

export async function removeBase(tripId: string, baseId: string): Promise<void> {
	const allBases = live(await db.bases.where('tripId').equals(tripId).toArray());
	const target = allBases.find((b) => b.id === baseId);
	const remaining = allBases.filter((b) => b.id !== baseId).sort((a, b) => a.sortOrder - b.sortOrder);
	const fallbackId = remaining[0]?.id ?? null;
	const affectedDays = live(await db.days.where('tripId').equals(tripId).toArray()).filter(
		(d) => d.baseId === baseId
	);
	const now = Date.now();
	await db.transaction('rw', db.bases, db.days, async () => {
		if (target) await db.bases.put({ ...target, updatedAt: now, deletedAt: now });
		await db.days.bulkPut(affectedDays.map((d) => ({ ...d, baseId: fallbackId, updatedAt: now })));
	});
}

// ── Seed ───────────────────────────────────────────────────────────────────

// Seed rows use *deterministic* ids (trip id + a natural key), so every device produces
// the identical set and cloud sync dedupes by id. With random uids each device seeded
// distinct rows for the same fixed-id trip, and sync merged them into 5× duplicates.
// Activities already had stable ids; bases/days/placements did not.
const seedBaseId = (tripId: string, colorToken: string) => `${tripId}:base:${colorToken}`;
const seedDayId = (tripId: string, date: string) => `${tripId}:day:${date}`;
const seedPlacementId = (tripId: string, date: string, activityId: string) =>
	`${tripId}:pl:${date}:${activityId}`;

function buildSeedGraph(now: number) {
	const tripId = SEED_TRIP.id;
	const trip: Trip = { ...SEED_TRIP, createdAt: now, updatedAt: now };

	const bases: Base[] = SEED_BASES.map((b, i) => ({
		id: seedBaseId(tripId, b.colorToken),
		tripId,
		name: b.name,
		colorToken: b.colorToken,
		sortOrder: i,
		updatedAt: now
	}));

	const activities: Activity[] = SEED_ACTIVITIES.map((a) => ({ ...a, tripId, updatedAt: now }));

	const isoDates = datesInRange(trip.startDate, trip.endDate);
	const days: Day[] = isoDates.map((date, i) => ({
		id: seedDayId(tripId, date),
		tripId,
		date,
		baseId: seedBaseId(tripId, SEED_DAY_BASES[i] ?? SEED_BASES[0].colorToken),
		sortOrder: i,
		updatedAt: now
	}));

	const placements: Placement[] = [];
	for (const [dayIdxStr, ids] of Object.entries(SEED_PLACEMENTS)) {
		const day = days[Number(dayIdxStr)];
		ids.forEach((activityId, sortOrder) => {
			placements.push({
				id: seedPlacementId(tripId, day.date, activityId),
				tripId,
				dayId: day.id,
				activityId,
				sortOrder,
				updatedAt: now
			});
		});
	}

	return { trip, bases, activities, days, placements };
}

// Seed the Mauritius trip on first run; if it already exists, repair legacy duplicates.
export async function seedIfEmpty(): Promise<string> {
	const existing = await db.trips.get(SEED_TRIP.id);
	if (existing) {
		await repairSeedTrip();
		return SEED_TRIP.id;
	}

	const now = Date.now();
	const { trip, bases, activities, days, placements } = buildSeedGraph(now);
	await db.transaction('rw', db.trips, db.bases, db.activities, db.days, db.placements, async () => {
		await db.trips.put(trip);
		await db.bases.bulkPut(bases);
		await db.activities.bulkPut(activities);
		await db.days.bulkPut(days);
		await db.placements.bulkPut(placements);
	});
	return SEED_TRIP.id;
}

// One-time self-heal for trips seeded before deterministic ids: tombstone the random-id
// bases/days/placements and lay down the single canonical deterministic set. The tombstones
// propagate through sync, so every device converges on the clean set without manual resets.
async function repairSeedTrip(): Promise<void> {
	const tripId = SEED_TRIP.id;
	const [curBases, curDays, curPlacements] = await Promise.all([
		db.bases.where('tripId').equals(tripId).toArray(),
		db.days.where('tripId').equals(tripId).toArray(),
		db.placements.where('tripId').equals(tripId).toArray()
	]);

	const canonicalDayIds = new Set(
		datesInRange(SEED_TRIP.startDate, SEED_TRIP.endDate).map((d) => seedDayId(tripId, d))
	);
	const liveDays = curDays.filter((d) => !d.deletedAt);
	const hasLegacy = liveDays.some((d) => !canonicalDayIds.has(d.id));
	const hasDupeDates = new Set(liveDays.map((d) => d.date)).size !== liveDays.length;
	if (!hasLegacy && !hasDupeDates) return; // already clean

	const now = Date.now();
	const { bases, days, placements } = buildSeedGraph(now);
	const keepBases = new Set(bases.map((b) => b.id));
	const keepDays = new Set(days.map((d) => d.id));
	const keepPlacements = new Set(placements.map((p) => p.id));

	const tomb = <T extends { id: string; deletedAt?: number }>(rows: T[], keep: Set<string>) =>
		rows
			.filter((r) => !r.deletedAt && !keep.has(r.id))
			.map((r) => ({ ...r, updatedAt: now, deletedAt: now }));

	await db.transaction('rw', db.bases, db.days, db.placements, async () => {
		const tb = tomb(curBases, keepBases);
		const td = tomb(curDays, keepDays);
		const tp = tomb(curPlacements, keepPlacements);
		if (tb.length) await db.bases.bulkPut(tb);
		if (td.length) await db.days.bulkPut(td);
		if (tp.length) await db.placements.bulkPut(tp);
		// Lay down the canonical set (creates missing, refreshes matching).
		await db.bases.bulkPut(bases);
		await db.days.bulkPut(days);
		await db.placements.bulkPut(placements);
	});
}
