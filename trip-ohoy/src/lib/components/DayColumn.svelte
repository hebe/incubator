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

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
		if (store.dragOverDayId !== day.id) store.dragOverDayId = day.id;
	}
	function onDragLeave() {
		if (store.dragOverDayId === day.id) store.dragOverDayId = null;
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		const id = e.dataTransfer?.getData('text/plain');
		store.dragOverDayId = null;
		if (id) store.addActivity(day.id, id);
	}
</script>

<div
	class="col"
	class:selected
	class:dragOver
	role="group"
	aria-label="Day column"
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

	<div class="body">
		{#each items as x (x.placement.id)}
			<ActivityCard
				activity={x.activity}
				onopen={() => store.openDetail(x.activity.id)}
				onremove={(e) => {
					e.stopPropagation();
					store.removePlacement(x.placement.id);
				}}
			/>
		{/each}
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
