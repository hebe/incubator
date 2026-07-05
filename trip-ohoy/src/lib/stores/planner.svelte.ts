// The planner store: Svelte 5 rune state for one trip, loaded from Dexie, with mutation
// methods that write through to Dexie immediately. Mirrors the prototype's component state
// (view, filter, selectedDay, dragOver, pickerDay, detailId, linkDraft) + the trip graph.

import type { Activity, ActivityMeta, Base, CategoryKey, Day, Link, Placement, Trip } from '$lib/types';
import {
	db,
	loadTripGraph,
	uid,
	type TripGraph,
	createActivity as dbCreateActivity,
	updateActivity as dbUpdateActivity,
	deleteActivity as dbDeleteActivity,
	updateTripDetails as dbUpdateTripDetails,
	addBase as dbAddBase,
	removeBase as dbRemoveBase
} from '$lib/data/local';
import { normalizeLink } from '$lib/data/derive';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

function mergeById<T extends { id: string; updatedAt: number }>(local: T[], server: T[]): T[] {
	const map = new Map(local.map((r) => [r.id, r]));
	for (const sv of server) {
		const lc = map.get(sv.id);
		map.set(sv.id, !lc || sv.updatedAt > lc.updatedAt ? sv : lc);
	}
	return [...map.values()];
}

function mergeMetaById(
	local: Record<string, ActivityMeta>,
	server: ActivityMeta[]
): Record<string, ActivityMeta> {
	const result = { ...local };
	for (const sv of server) {
		const lc = local[sv.activityId];
		if (!lc || sv.updatedAt > lc.updatedAt) result[sv.activityId] = sv;
	}
	return result;
}

type Filter = CategoryKey | 'all';
type View = 'board' | 'list';

export class PlannerStore {
	trip = $state<Trip | null>(null);
	bases = $state<Base[]>([]);
	activities = $state<Activity[]>([]);
	days = $state<Day[]>([]);
	placements = $state<Placement[]>([]);
	meta = $state<Record<string, ActivityMeta>>({});

	view = $state<View>('board');
	filter = $state<Filter>('all');
	selectedDayId = $state<string | null>(null);
	dragOverDayId = $state<string | null>(null);
	pickerDayId = $state<string | null>(null);
	detailActivityId = $state<string | null>(null);
	linkDraft = $state<Link>({ label: '', url: '' });
	loaded = $state(false);

	// 'closed' | 'create' | activityId (edit)
	activityFormMode = $state<'closed' | 'create' | string>('closed');
	basesOpen = $state(false);
	editTripOpen = $state(false);
	syncStatus = $state<SyncStatus>('idle');

	async load(tripId: string) {
		const g = await loadTripGraph(tripId);
		if (!g) return;
		this.apply(g);
		this.selectedDayId = g.days[0]?.id ?? null;
		this.loaded = true;
		this.sync();
	}

	private apply(g: TripGraph) {
		this.trip = g.trip;
		this.bases = g.bases;
		this.activities = g.activities;
		this.days = g.days;
		this.placements = g.placements;
		this.meta = g.meta;
	}

	// ── Lookups / derived ──────────────────────────────────────────────────────
	get activityById(): Map<string, Activity> {
		return new Map(this.activities.map((a) => [a.id, a]));
	}
	get baseById(): Map<string, Base> {
		return new Map(this.bases.map((b) => [b.id, b]));
	}
	get usedActivityIds(): Set<string> {
		const used = new Set<string>();
		const byId = this.activityById;
		for (const p of this.placements) {
			const a = byId.get(p.activityId);
			if (a && !a.reusable) used.add(a.id);
		}
		return used;
	}
	placementsForDay(dayId: string): Placement[] {
		return this.placements
			.filter((p) => p.dayId === dayId)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}
	get bankActivities(): Activity[] {
		return this.activities.filter((a) => this.filter === 'all' || a.category === this.filter);
	}
	get summary(): { planned: number; carDays: number } {
		const byId = this.activityById;
		const planned = this.placements.length;
		let carDays = 0;
		for (const d of this.days) {
			const needsCar = this.placementsForDay(d.id).some((p) => byId.get(p.activityId)?.needsCar);
			if (needsCar) carDays++;
		}
		return { planned, carDays };
	}
	metaFor(activityId: string): ActivityMeta {
		return this.meta[activityId] ?? { activityId, notes: '', links: [], updatedAt: 0 };
	}

	// ── View state ─────────────────────────────────────────────────────────────
	setView = (v: View) => (this.view = v);
	setFilter = (f: Filter) => (this.filter = f);
	selectDay = (dayId: string) => (this.selectedDayId = dayId);
	openPicker = (dayId: string) => (this.pickerDayId = dayId);
	closePicker = () => (this.pickerDayId = null);
	openDetail = (activityId: string) => (this.detailActivityId = activityId);
	closeDetail = () => {
		this.detailActivityId = null;
		this.linkDraft = { label: '', url: '' };
	};
	openNewActivity = () => (this.activityFormMode = 'create');
	openEditActivity = (id: string) => (this.activityFormMode = id);
	closeActivityForm = () => (this.activityFormMode = 'closed');
	openBasesManager = () => (this.basesOpen = true);
	closeBasesManager = () => (this.basesOpen = false);
	openEditTrip = () => (this.editTripOpen = true);
	closeEditTrip = () => (this.editTripOpen = false);

	async updateTrip(patch: { destination: string; startDate: string; endDate: string }) {
		if (!this.trip) return;
		const result = await dbUpdateTripDetails(this.trip.id, patch);
		if (!result) return;
		// Dates may have added/removed days — reload the whole graph to refresh state.
		const g = await loadTripGraph(this.trip.id);
		if (g) {
			this.apply(g);
			if (!this.days.some((d) => d.id === this.selectedDayId)) {
				this.selectedDayId = this.days[0]?.id ?? null;
			}
		}
		this.closeEditTrip();
		// Propagate the day/placement removals so the server doesn't resurrect them on sync.
		this.sync({ days: result.removedDayIds, placements: result.removedPlacementIds });
	}

	// ── Mutations (state + write-through) ───────────────────────────────────────
	async addActivity(dayId: string, activityId: string) {
		const a = this.activityById.get(activityId);
		if (!a) return;
		if (!a.reusable && this.usedActivityIds.has(activityId)) return;
		const sortOrder = this.placementsForDay(dayId).length;
		const p: Placement = { id: uid(), tripId: a.tripId, dayId, activityId, sortOrder, updatedAt: Date.now() };
		this.placements = [...this.placements, p];
		await db.placements.put($state.snapshot(p));
	}

	async removePlacement(placementId: string) {
		this.placements = this.placements.filter((p) => p.id !== placementId);
		await db.placements.delete(placementId);
	}

	async cycleBase(dayId: string) {
		if (this.bases.length === 0) return;
		const day = this.days.find((d) => d.id === dayId);
		if (!day) return;
		const idx = this.bases.findIndex((b) => b.id === day.baseId);
		const next = this.bases[(idx + 1) % this.bases.length];
		const updated: Day = { ...day, baseId: next.id, updatedAt: Date.now() };
		this.days = this.days.map((d) => (d.id === dayId ? updated : d));
		await db.days.put($state.snapshot(updated));
	}

	// ── Activity meta (notes + links, shared across placements) ─────────────────
	private async patchMeta(activityId: string, patch: Partial<Pick<ActivityMeta, 'notes' | 'links'>>) {
		const cur = this.metaFor(activityId);
		const next: ActivityMeta = { activityId, notes: cur.notes, links: cur.links, ...patch, updatedAt: Date.now() };
		this.meta = { ...this.meta, [activityId]: next };
		await db.activityMeta.put($state.snapshot(next));
	}
	setNotes = (activityId: string, notes: string) => this.patchMeta(activityId, { notes });
	async addLink(activityId: string) {
		const norm = normalizeLink(this.linkDraft.url, this.linkDraft.label);
		if (!norm) return;
		const cur = this.metaFor(activityId);
		await this.patchMeta(activityId, { links: [...cur.links, norm] });
		this.linkDraft = { label: '', url: '' };
	}
	async removeLink(activityId: string, idx: number) {
		const cur = this.metaFor(activityId);
		await this.patchMeta(activityId, { links: cur.links.filter((_, i) => i !== idx) });
	}

	// ── Activity CRUD ───────────────────────────────────────────────────────────
	async toggleConfirmed(activityId: string) {
		const a = this.activityById.get(activityId);
		if (!a) return;
		const updated = await dbUpdateActivity(activityId, { confirmed: !a.confirmed });
		if (updated) this.activities = this.activities.map((x) => (x.id === activityId ? updated : x));
	}

	async saveActivity(data: Omit<Activity, 'id' | 'tripId' | 'updatedAt'>, editId?: string) {
		if (!this.trip) return;
		if (editId) {
			const updated = await dbUpdateActivity(editId, data);
			if (updated) {
				this.activities = this.activities.map((a) => (a.id === editId ? updated : a));
			}
		} else {
			const a = await dbCreateActivity(this.trip.id, data);
			this.activities = [...this.activities, a];
		}
		this.closeActivityForm();
	}

	async deleteActivity(id: string) {
		await dbDeleteActivity(id);
		this.activities = this.activities.filter((a) => a.id !== id);
		this.placements = this.placements.filter((p) => p.activityId !== id);
		const meta = { ...this.meta };
		delete meta[id];
		this.meta = meta;
		if (this.detailActivityId === id) this.closeDetail();
		this.closeActivityForm();
	}

	// ── Cloud sync ──────────────────────────────────────────────────────────────
	// `del` carries ids the client has deleted so the server removes them too — without
	// tombstones, the server would otherwise send them back and the merge would resurrect.
	async sync(del?: { days?: string[]; placements?: string[] }) {
		if (!this.trip) return;
		this.syncStatus = 'syncing';
		try {
			const res = await fetch('/api/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tripId: this.trip.id,
					push: {
						trips: [this.trip],
						bases: $state.snapshot(this.bases),
						activities: $state.snapshot(this.activities),
						days: $state.snapshot(this.days),
						placements: $state.snapshot(this.placements),
						activityMeta: Object.values($state.snapshot(this.meta))
					},
					del: del && (del.days?.length || del.placements?.length) ? del : undefined
				})
			});
			if (!res.ok) throw new Error('sync failed');
			const server = await res.json();

			// Merge server response — take newer record per item (LWW on client)
			const mergedBases = mergeById(this.bases, server.bases as Base[]);
			const mergedActivities = mergeById(this.activities, server.activities as Activity[]);
			const mergedDays = mergeById(this.days, server.days as Day[]);
			const mergedPlacements = mergeById(this.placements, server.placements as Placement[]);
			const mergedMeta = mergeMetaById(this.meta, server.activityMeta as ActivityMeta[]);

			if (server.trips?.[0] && server.trips[0].updatedAt > (this.trip?.updatedAt ?? 0)) {
				this.trip = server.trips[0];
				await db.trips.put($state.snapshot(server.trips[0]));
			}
			this.bases = mergedBases;
			this.activities = mergedActivities;
			this.days = mergedDays;
			this.placements = mergedPlacements;
			this.meta = mergedMeta;

			await Promise.all([
				db.bases.bulkPut(mergedBases.map((r) => $state.snapshot(r))),
				db.activities.bulkPut(mergedActivities.map((r) => $state.snapshot(r))),
				db.days.bulkPut(mergedDays.map((r) => $state.snapshot(r))),
				db.placements.bulkPut(mergedPlacements.map((r) => $state.snapshot(r))),
				db.activityMeta.bulkPut(Object.values(mergedMeta).map((r) => $state.snapshot(r)))
			]);

			this.syncStatus = 'synced';
		} catch {
			this.syncStatus = 'error';
		}
	}

	// ── Base CRUD ───────────────────────────────────────────────────────────────
	async addNewBase(name: string, colorToken: string) {
		if (!this.trip) return;
		const base = await dbAddBase(this.trip.id, name, colorToken);
		this.bases = [...this.bases, base];
	}

	async deleteBase(baseId: string) {
		if (!this.trip) return;
		const remaining = this.bases.filter((b) => b.id !== baseId);
		const fallbackId = remaining[0]?.id ?? null;
		await dbRemoveBase(this.trip.id, baseId);
		this.days = this.days.map((d) => (d.baseId === baseId ? { ...d, baseId: fallbackId } : d));
		this.bases = remaining;
	}
}
