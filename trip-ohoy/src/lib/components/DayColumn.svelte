<script lang="ts">
	import type { Day } from '$lib/types';
	import type { PlannerStore } from '$lib/stores/planner.svelte';
	import { moodOf, weekdayShort, dateShort } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import ActivityCard from './ActivityCard.svelte';
	import BaseChip from './BaseChip.svelte';
	import MoodChip from './MoodChip.svelte';

	let { store, day }: { store: PlannerStore; day: Day } = $props();

	const byId = $derived(store.activityById);
	const items = $derived(
		store
			.placementsForDay(day.id)
			.map((p) => ({ placement: p, activity: byId.get(p.activityId)! }))
			.filter((x) => x.activity)
	);
	const base = $derived(day.baseId ? store.baseById.get(day.baseId) : undefined);
	const needsCar = $derived(items.some((x) => x.activity.needsCar));
	const mood = $derived(moodOf(items.map((x) => x.activity.energy)));
	const selected = $derived(store.selectedDayId === day.id);
	const dragOver = $derived(store.dragOverDayId === day.id);

	let colEl: HTMLElement;
	let bodyEl: HTMLElement;
	// Insertion position while reordering: an index into `items` minus the moving card.
	let dropIndex = $state<number | null>(null);

	const movingId = $derived(store.draggingPlacementId);
	const isReorder = $derived(movingId != null && dragOver);
	const others = $derived(items.filter((x) => x.placement.id !== movingId));
	const lineBeforePid = $derived(
		dropIndex == null || dropIndex >= others.length ? null : others[dropIndex].placement.id
	);

	// Where the pointer sits relative to the stationary cards (the moving card excluded).
	function computeIndex(e: DragEvent): number {
		const wraps = [...bodyEl.querySelectorAll<HTMLElement>('.card-wrap')].filter(
			(w) => w.dataset.pid !== movingId
		);
		for (let i = 0; i < wraps.length; i++) {
			const r = wraps[i].getBoundingClientRect();
			if (e.clientY < r.top + r.height / 2) return i;
		}
		return wraps.length;
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		const moving = store.draggingPlacementId != null;
		if (e.dataTransfer) e.dataTransfer.dropEffect = moving ? 'move' : 'copy';
		if (store.dragOverDayId !== day.id) store.dragOverDayId = day.id;
		dropIndex = moving ? computeIndex(e) : null;
	}
	function onDragLeave(e: DragEvent) {
		// Ignore leaves that cross into a child element of this column.
		if (e.relatedTarget instanceof Node && colEl.contains(e.relatedTarget)) return;
		if (store.dragOverDayId === day.id) store.dragOverDayId = null;
		dropIndex = null;
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		const raw = e.dataTransfer?.getData('text/plain') ?? '';
		const idx = dropIndex;
		store.dragOverDayId = null;
		dropIndex = null;
		if (raw.startsWith('placement:')) {
			store.movePlacement(raw.slice('placement:'.length), day.id, idx ?? undefined);
		} else if (raw) {
			store.addActivity(day.id, raw);
		}
		store.draggingPlacementId = null;
	}

	function onCardDragStart(e: DragEvent, placementId: string) {
		if (!e.dataTransfer) return;
		e.dataTransfer.setData('text/plain', `placement:${placementId}`);
		e.dataTransfer.effectAllowed = 'move';
		store.draggingPlacementId = placementId;
	}
	function onCardDragEnd() {
		// Clears whether the drop landed on a column or was cancelled outside one.
		store.draggingPlacementId = null;
		store.dragOverDayId = null;
		dropIndex = null;
	}
</script>

<div
	class="col"
	class:selected
	class:dragOver
	role="group"
	aria-label="Day column"
	bind:this={colEl}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	<div
		class="head"
		role="button"
		tabindex="0"
		onclick={() => store.selectDay(day.id)}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && store.selectDay(day.id)}
	>
		<div class="head-top">
			<span class="wd">{weekdayShort(day.date)}</span>
			<span class="date">{dateShort(day.date)}</span>
		</div>
		<div class="head-bottom">
			<BaseChip
				{base}
				onclick={(e) => {
					e.stopPropagation();
					store.cycleBase(day.id);
				}}
			/>
			{#if needsCar}<span title={t.needsCarTip} class="car">🚗</span>{/if}
		</div>
	</div>

	<div class="body" bind:this={bodyEl}>
		{#each items as x (x.placement.id)}
			{#if lineBeforePid === x.placement.id}<div class="ins"></div>{/if}
			<div
				class="card-wrap"
				class:dragging={x.placement.id === movingId}
				data-pid={x.placement.id}
				role="listitem"
				draggable="true"
				ondragstart={(e) => onCardDragStart(e, x.placement.id)}
				ondragend={onCardDragEnd}
			>
				<ActivityCard
					activity={x.activity}
					onopen={() => store.openDetail(x.activity.id)}
					onremove={(e) => {
						e.stopPropagation();
						store.removePlacement(x.placement.id);
					}}
				/>
			</div>
		{/each}
		{#if isReorder && lineBeforePid === null && others.length > 0}<div class="ins"></div>{/if}
		{#if items.length === 0}
			<div class="empty">{t.emptyDay}</div>
		{/if}
	</div>

	<div class="foot">
		{#if mood}<MoodChip {mood} />{/if}
		<button class="add" onclick={(e) => { e.stopPropagation(); store.openPicker(day.id); }}>{t.add}</button>
	</div>
</div>

<style>
	.col {
		width: 234px;
		flex: 0 0 234px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-card);
		display: flex;
		flex-direction: column;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
		transition:
			border-color 0.12s,
			box-shadow 0.12s;
		align-self: stretch;
	}
	.col.selected {
		border-color: oklch(0.5 0.09 220);
		box-shadow: 0 0 0 2px oklch(0.85 0.06 220);
	}
	.col.dragOver {
		border-color: var(--drop-border);
		border-style: dashed;
		background: var(--drop-bg);
	}
	.head {
		display: flex;
		flex-direction: column;
		gap: 7px;
		padding: 11px 12px;
		cursor: pointer;
		border-bottom: 1px solid var(--border-soft);
	}
	.head-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.wd {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.date {
		font-size: 13px;
		font-weight: 700;
		color: oklch(0.28 0.012 70);
	}
	.head-bottom {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.car {
		font-size: 13px;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 7px;
		padding: 10px;
		flex: 1;
		min-height: 96px;
	}
	.card-wrap {
		cursor: grab;
	}
	.card-wrap:active {
		cursor: grabbing;
	}
	.card-wrap.dragging {
		opacity: 0.4;
	}
	.ins {
		height: 0;
		margin: -3.5px 0;
		border-top: 2px solid var(--drop-border);
		border-radius: 2px;
	}
	.empty {
		font-size: 11.5px;
		color: var(--text-faint);
		text-align: center;
		padding: 16px 6px;
		border: 1px dashed oklch(0.88 0.01 85);
		border-radius: var(--r-sm);
	}
	.foot {
		padding: 0 10px 11px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.add {
		font-size: 12px;
		font-weight: 600;
		color: var(--action);
		background: var(--action-soft-bg);
		border: 1px solid var(--action-soft-border);
		border-radius: var(--r-sm);
		padding: 7px;
		cursor: pointer;
	}
</style>
