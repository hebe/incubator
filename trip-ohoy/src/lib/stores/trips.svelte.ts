// Reactive store for the trip list — loaded from Dexie, with create/delete mutations.

import { db, createTripWithDays, deleteTrip as dbDeleteTrip } from '$lib/data/local';
import { datesInRange } from '$lib/data/derive';
import type { Trip } from '$lib/types';

export class TripsStore {
	trips = $state<Trip[]>([]);
	loaded = $state(false);

	async loadAll() {
		const all = await db.trips.toArray();
		this.trips = all.sort((a, b) => a.createdAt - b.createdAt);
		this.loaded = true;
		this.pullRemote();
	}

	// Pull the trip list from the server and LWW-merge by updatedAt, so trips created on
	// another device appear here. Only trip rows — each trip's full graph syncs on open.
	private async pullRemote() {
		try {
			const res = await fetch('/api/sync');
			if (!res.ok) return;
			const { trips: remote } = (await res.json()) as { trips: Trip[] };
			const byId = new Map(this.trips.map((t) => [t.id, t]));
			const winners: Trip[] = [];
			for (const sv of remote) {
				const lc = byId.get(sv.id);
				if (!lc || sv.updatedAt > lc.updatedAt) {
					byId.set(sv.id, sv);
					winners.push(sv);
				}
			}
			if (winners.length) {
				await db.trips.bulkPut(winners);
				this.trips = [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
			}
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
		await dbDeleteTrip(id);
		this.trips = this.trips.filter((t) => t.id !== id);
	}

	dayCount(trip: Trip): number {
		return datesInRange(trip.startDate, trip.endDate).length;
	}
}
