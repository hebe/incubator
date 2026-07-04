// Reactive store for the trip list — loaded from Dexie, with create/delete mutations.

import { db, createTripWithDays, deleteTrip as dbDeleteTrip } from '$lib/data/local';
import { datesInRange } from '$lib/data/derive';
import type { Trip } from '$lib/types';

export class TripsStore {
	trips = $state<Trip[]>([]);
	loaded = $state(false);

	async loadAll() {
		this.trips = await db.trips.orderBy('createdAt').toArray();
		this.loaded = true;
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
