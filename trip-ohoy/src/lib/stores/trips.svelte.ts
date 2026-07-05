// Reactive store for the trip list — loaded from Dexie, with create/delete mutations.

import { db, createTripWithDays, deleteTrip as dbDeleteTrip } from '$lib/data/local';
import { datesInRange } from '$lib/data/derive';
import type { Trip } from '$lib/types';

export class TripsStore {
	trips = $state<Trip[]>([]);
	loaded = $state(false);

	async loadAll() {
		const all = await db.trips.toArray();
		this.trips = all.filter((t) => !t.deletedAt).sort((a, b) => a.createdAt - b.createdAt);
		this.loaded = true;
		this.pullRemote();
	}

	// Pull the trip list from the server and LWW-merge by updatedAt, so trips created (or
	// deleted) on another device show up here. Tombstones are kept in Dexie so they keep
	// propagating, but filtered out of the visible list. Trip rows only — each trip's full
	// graph syncs when opened.
	private async pullRemote() {
		try {
			const res = await fetch('/api/sync');
			if (!res.ok) return;
			const { trips: remote } = (await res.json()) as { trips: Trip[] };
			// Merge against the full local set incl. tombstones, not just the visible list.
			const localAll = await db.trips.toArray();
			const byId = new Map(localAll.map((t) => [t.id, t]));
			const winners: Trip[] = [];
			for (const sv of remote) {
				const lc = byId.get(sv.id);
				if (!lc || sv.updatedAt > lc.updatedAt) {
					byId.set(sv.id, sv);
					winners.push(sv);
				}
			}
			if (winners.length) await db.trips.bulkPut(winners);
			this.trips = [...byId.values()]
				.filter((t) => !t.deletedAt)
				.sort((a, b) => a.createdAt - b.createdAt);
		} catch {
			// offline / server unreachable — local list stands
		}
	}

	async create(
		destination: string,
		startDate: string,
		endDate: string,
		bases: Array<{ name: string; colorToken: string }>
	): Promise<string> {
		const trip = await createTripWithDays(destination, startDate, endDate, bases);
		this.trips = [...this.trips, trip];
		return trip.id;
	}

	async delete(id: string) {
		await dbDeleteTrip(id); // soft-delete: tombstones the trip and its whole graph
		this.trips = this.trips.filter((t) => t.id !== id);
		this.pushDeletion(id);
	}

	// Push the tombstoned graph so the deletion reaches the server (and other devices).
	private async pushDeletion(tripId: string) {
		try {
			const [trip, bases, activities, days, placements, allMeta] = await Promise.all([
				db.trips.get(tripId),
				db.bases.where('tripId').equals(tripId).toArray(),
				db.activities.where('tripId').equals(tripId).toArray(),
				db.days.where('tripId').equals(tripId).toArray(),
				db.placements.where('tripId').equals(tripId).toArray(),
				db.activityMeta.toArray()
			]);
			const activityIds = new Set(activities.map((a) => a.id));
			await fetch('/api/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tripId,
					push: {
						trips: trip ? [trip] : [],
						bases,
						activities,
						days,
						placements,
						activityMeta: allMeta.filter((m) => activityIds.has(m.activityId))
					}
				})
			});
		} catch {
			// offline — the tombstone stays in Dexie and pushes on the next sync
		}
	}

	dayCount(trip: Trip): number {
		return datesInRange(trip.startDate, trip.endDate).length;
	}
}
