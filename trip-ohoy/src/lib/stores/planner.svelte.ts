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
import { normalizeLink, durationWeight, type DurationWeight } from '$lib/data/derive';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// LWW merge by updatedAt. Tombstones (deletedAt set) participate like any other row — a
// newer tombstone wins over a live row, which is how deletions propagate across devices.
function mergeById<T extends { id: string; updatedAt: number }>(local: T[], server: T[]): T[] {
	const map = new Map(local.map((r) => [r.id, r]));
	for (const sv of server) {
		const lc = map.get(sv.id);
		map.set(sv.id, !lc || sv.updatedAt > lc.updatedAt ? sv : lc);
	}
	return [...map.values()];
}

// Keep tombstones in Dexie (they must keep propagating) but never in reactive/UI state.
function live<T extends { deletedAt?: number }>(rows: T[]): T[] {
	return rows.filter((r) => !r.deletedAt);
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
type LengthFilter = DurationWeight | 'all';
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
	lengthFilter = $state<LengthFilter>('all');
	selectedDayId = $state<string | null>(null);
	dragOverDayId = $state<string | null>(null);
	// Set while an already-placed card is being dragged (null = dragging a bank card).
	draggingPlacementId = $state<string | null>(null);
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
		return this.activities.filter(
			(a) =>
				(this.filter === 'all' || a.category === this.filter) &&
				(this.lengthFilter === 'all' || durationWeight(a.durationLabel) === this.lengthFilter)
		);
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
	setLengthFilter = (f: LengthFilter) => (this.lengthFilter = f);
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
		const updated = await dbUpdateTripDetails(this.trip.id, patch);
		if (!updated) return;
		// Dates may have added/removed days — reload the whole graph to refresh state.
		const g = await loadTripGraph(this.trip.id);
		if (g) {
			this.apply(g);
			if (!this.days.some((d) => d.id === this.selectedDayId)) {
				this.selectedDayId = this.days[0]?.id ?? null;
			}
		}
		this.closeEditTrip();
		// Removed days/placements are tombstoned in Dexie; sync propagates them.
		this.sync();
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

	// Move a placed activity to another day and/or a new position within a day. `toIndex` is
	// an index into the destination day's placements *excluding* the moving one (as the drag
	// UI computes it); omit to append. Renumbers the destination day's sortOrder densely; the
	// source day keeps its (now-gapped) order, which sorts fine.
	async movePlacement(placementId: string, toDayId: string, toIndex?: number) {
		const p = this.placements.find((x) => x.id === placementId);
		if (!p) return;
		const now = Date.now();
		const target = this.placementsForDay(toDayId).filter((x) => x.id !== placementId);
		const idx = toIndex == null ? target.length : Math.max(0, Math.min(toIndex, target.length));
		target.splice(idx, 0, p);

		const updates: Placement[] = [];
		target.forEach((row, i) => {
			const moved = row.id === placementId;
			const changed = moved ? p.dayId !== toDayId || p.sortOrder !== i : row.sortOrder !== i;
			if (changed) updates.push({ ...row, dayId: toDayId, sortOrder: i, updatedAt: now });
		});
		if (!updates.length) return;

		const byId = new Map(updates.map((u) => [u.id, u]));
		this.placements = this.placements.map((x) => byId.get(x.id) ?? x);
		await db.placements.bulkPut(updates.map((u) => $state.snapshot(u)));
		this.sync();
	}

	async removePlacement(placementId: string) {
		const existing = this.placements.find((p) => p.id === placementId);
		this.placements = this.placements.filter((p) => p.id !== placementId);
		if (existing) {
			await db.placements.put({ ...$state.snapshot(existing), updatedAt: Date.now(), deletedAt: Date.now() });
		}
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
	// Pushes the full local trip graph *including tombstones* (read raw from Dexie, since
	// reactive state is live-only) and LWW-merges the reply. Deletions ride along as
	// tombstones — no separate delete path.
	async sync() {
		if (!this.trip) return;
		const tripId = this.trip.id;
		this.syncStatus = 'syncing';
		try {
			const [rawBases, rawActivities, rawDays, rawPlacements, allMeta] = await Promise.all([
				db.bases.where('tripId').equals(tripId).toArray(),
				db.activities.where('tripId').equals(tripId).toArray(),
				db.days.where('tripId').equals(tripId).toArray(),
				db.placements.where('tripId').equals(tripId).toArray(),
				db.activityMeta.toArray()
			]);
			// activity_meta isn't trip-scoped in Dexie — narrow it to this trip's activities.
			const tripActivityIds = new Set(rawActivities.map((a) => a.id));
			const rawMeta = allMeta.filter((m) => tripActivityIds.has(m.activityId));

			const res = await fetch('/api/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tripId,
					push: {
						trips: [$state.snapshot(this.trip)],
						bases: rawBases,
						activities: rawActivities,
						days: rawDays,
						placements: rawPlacements,
						activityMeta: rawMeta
					}
				})
			});
			if (!res.ok) throw new Error('sync failed');
			const server = await res.json();

			// Merge server response against the raw local set (tombstones included) — LWW.
			const mergedBases = mergeById(rawBases, server.bases as Base[]);
			const mergedActivities = mergeById(rawActivities, server.activities as Activity[]);
			const mergedDays = mergeById(rawDays, server.days as Day[]);
			const mergedPlacements = mergeById(rawPlacements, server.placements as Placement[]);
			const localMetaRecord = Object.fromEntries(rawMeta.map((m) => [m.activityId, m]));
			const mergedMeta = mergeMetaById(localMetaRecord, server.activityMeta as ActivityMeta[]);

			if (server.trips?.[0] && server.trips[0].updatedAt > (this.trip?.updatedAt ?? 0)) {
				this.trip = server.trips[0];
				await db.trips.put($state.snapshot(server.trips[0]));
			}
			// Reactive state shows only live rows; Dexie keeps the tombstones so the
			// deletions keep syncing until every device has seen them.
			this.bases = live(mergedBases);
			this.activities = live(mergedActivities);
			this.days = live(mergedDays);
			this.placements = live(mergedPlacements);
			this.meta = Object.fromEntries(
				Object.entries(mergedMeta).filter(([, m]) => !m.deletedAt)
			);

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
