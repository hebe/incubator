import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import {
	trips,
	bases,
	activities,
	days,
	placements,
	activityMeta
} from '$lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { Activity, ActivityMeta, Base, Day, Link, Placement, Trip } from '$lib/types';

interface SyncPayload {
	tripId: string;
	push: {
		trips?: Trip[];
		bases?: Base[];
		activities?: Activity[];
		days?: Day[];
		placements?: Placement[];
		activityMeta?: ActivityMeta[];
	};
}

// Ensure the tombstone column is present on every pushed row (undefined → live = 0), so
// Drizzle's bulk insert sees a consistent column set.
function withTomb<T extends { deletedAt?: number }>(rows: T[]): (T & { deletedAt: number })[] {
	return rows.map((r) => ({ ...r, deletedAt: r.deletedAt ?? 0 }));
}

// LWW upsert helpers — only update if the incoming record is newer.

async function upsertTrips(rows: Trip[]) {
	if (!rows.length) return;
	await db
		.insert(trips)
		.values(withTomb(rows))
		.onConflictDoUpdate({
			target: trips.id,
			set: {
				destination: sql`excluded.destination`,
				startDate: sql`excluded.start_date`,
				endDate: sql`excluded.end_date`,
				createdAt: sql`excluded.created_at`,
				updatedAt: sql`excluded.updated_at`,
				deletedAt: sql`excluded.deleted_at`
			},
			setWhere: sql`excluded.updated_at > ${trips.updatedAt}`
		});
}

async function upsertBases(rows: Base[]) {
	if (!rows.length) return;
	await db
		.insert(bases)
		.values(withTomb(rows))
		.onConflictDoUpdate({
			target: bases.id,
			set: {
				tripId: sql`excluded.trip_id`,
				name: sql`excluded.name`,
				colorToken: sql`excluded.color_token`,
				sortOrder: sql`excluded.sort_order`,
				updatedAt: sql`excluded.updated_at`,
				deletedAt: sql`excluded.deleted_at`
			},
			setWhere: sql`excluded.updated_at > ${bases.updatedAt}`
		});
}

async function upsertActivities(rows: Activity[]) {
	if (!rows.length) return;
	await db
		.insert(activities)
		.values(withTomb(rows))
		.onConflictDoUpdate({
			target: activities.id,
			set: {
				tripId: sql`excluded.trip_id`,
				emoji: sql`excluded.emoji`,
				name: sql`excluded.name`,
				category: sql`excluded.category`,
				durationLabel: sql`excluded.duration_label`,
				energy: sql`excluded.energy`,
				weather: sql`excluded.weather`,
				needsCar: sql`excluded.needs_car`,
				reusable: sql`excluded.reusable`,
				confirmed: sql`excluded.confirmed`,
				placeLabel: sql`excluded.place_label`,
				lat: sql`excluded.lat`,
				lng: sql`excluded.lng`,
				updatedAt: sql`excluded.updated_at`,
				deletedAt: sql`excluded.deleted_at`
			},
			setWhere: sql`excluded.updated_at > ${activities.updatedAt}`
		});
}

async function upsertDays(rows: Day[]) {
	if (!rows.length) return;
	await db
		.insert(days)
		.values(withTomb(rows))
		.onConflictDoUpdate({
			target: days.id,
			set: {
				tripId: sql`excluded.trip_id`,
				date: sql`excluded.date`,
				baseId: sql`excluded.base_id`,
				sortOrder: sql`excluded.sort_order`,
				updatedAt: sql`excluded.updated_at`,
				deletedAt: sql`excluded.deleted_at`
			},
			setWhere: sql`excluded.updated_at > ${days.updatedAt}`
		});
}

async function upsertPlacements(rows: Placement[]) {
	if (!rows.length) return;
	await db
		.insert(placements)
		.values(withTomb(rows))
		.onConflictDoUpdate({
			target: placements.id,
			set: {
				tripId: sql`excluded.trip_id`,
				dayId: sql`excluded.day_id`,
				activityId: sql`excluded.activity_id`,
				sortOrder: sql`excluded.sort_order`,
				updatedAt: sql`excluded.updated_at`,
				deletedAt: sql`excluded.deleted_at`
			},
			setWhere: sql`excluded.updated_at > ${placements.updatedAt}`
		});
}

async function upsertActivityMeta(rows: ActivityMeta[]) {
	if (!rows.length) return;
	await db
		.insert(activityMeta)
		.values(rows.map((m) => ({ ...m, links: m.links as Link[], deletedAt: m.deletedAt ?? 0 })))
		.onConflictDoUpdate({
			target: activityMeta.activityId,
			set: {
				notes: sql`excluded.notes`,
				links: sql`excluded.links`,
				updatedAt: sql`excluded.updated_at`,
				deletedAt: sql`excluded.deleted_at`
			},
			setWhere: sql`excluded.updated_at > ${activityMeta.updatedAt}`
		});
}

// List all trips (single-user app → the whole table). Used by the home page so trips
// created on another device show up here even before they're opened.
export const GET: RequestHandler = async () => {
	const tripsData = await db.select().from(trips);
	return json({ trips: tripsData });
};

export const POST: RequestHandler = async ({ request }) => {
	let body: SyncPayload;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const { tripId, push } = body;
	if (!tripId) error(400, 'tripId required');

	// Push client records to server (LWW). Deletions arrive as tombstones (deletedAt set)
	// and flow through the same upserts — no separate delete path.
	await Promise.all([
		upsertTrips(push.trips ?? []),
		upsertBases(push.bases ?? []),
		upsertActivities(push.activities ?? []),
		upsertDays(push.days ?? []),
		upsertPlacements(push.placements ?? []),
		upsertActivityMeta(push.activityMeta ?? [])
	]);

	// Return current server state for this trip
	const [tripsData, basesData, activitiesData, daysData, placementsData] = await Promise.all([
		db.select().from(trips).where(eq(trips.id, tripId)),
		db.select().from(bases).where(eq(bases.tripId, tripId)),
		db.select().from(activities).where(eq(activities.tripId, tripId)),
		db.select().from(days).where(eq(days.tripId, tripId)),
		db.select().from(placements).where(eq(placements.tripId, tripId))
	]);

	const activityIds = activitiesData.map((a) => a.id);
	const metaRows = activityIds.length
		? await db.query.activityMeta.findMany({
				where: (m, { inArray }) => inArray(m.activityId, activityIds)
			})
		: [];

	return json({
		trips: tripsData,
		bases: basesData,
		activities: activitiesData,
		days: daysData,
		placements: placementsData,
		activityMeta: metaRows
	});
};
