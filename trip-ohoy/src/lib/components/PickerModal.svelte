<script lang="ts">
	// Mobile add-activity picker. Stays open for multi-add; "Done" closes.
	import type { PlannerStore } from '$lib/stores/planner.svelte';
	import { CATEGORY_BY_KEY } from '$lib/data/catalog';
	import { weekdayFull, dateLong } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import Badges from './Badges.svelte';
	import EnergyMeta from './EnergyMeta.svelte';
	import CategoryFilter from './CategoryFilter.svelte';

	let { store }: { store: PlannerStore } = $props();

	const day = $derived(store.pickerDayId ? store.days.find((d) => d.id === store.pickerDayId) : undefined);
	const used = $derived(store.usedActivityIds);
</script>

{#if day}
	<div
		class="scrim"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && store.closePicker()}
	>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="head">
				<div>
					<div class="kicker">{t.pickerKicker}</div>
					<div class="title">{weekdayFull(day.date)} {dateLong(day.date)}</div>
				</div>
				<button class="done" onclick={store.closePicker}>{t.done}</button>
			</div>

			<div class="filter"><CategoryFilter filter={store.filter} onselect={store.setFilter} /></div>

			<div class="list">
				{#each store.bankActivities as a (a.id)}
					{@const cat = CATEGORY_BY_KEY[a.category]}
					{@const isUsed = !a.reusable && used.has(a.id)}
					<button
						class="row"
						class:used={isUsed}
						style="border-left:4px solid {cat.colorVar};"
						disabled={isUsed}
						onclick={() => day && store.addActivity(day.id, a.id)}
					>
						<span class="emoji">{a.emoji}</span>
						<div class="body">
							<div class="name-line">
								<span class="name">{a.name}</span>
								{#if a.reusable}<span class="reuse" title={t.reusableTip}>↻</span>{/if}
							</div>
							<EnergyMeta energy={a.energy} text={`${cat.label} · ${a.durationLabel} · ${a.energy}`} />
							<Badges activity={a} />
						</div>
						{#if isUsed}
							<span class="planned">{t.planned}</span>
						{:else}
							<span class="plus">+</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: var(--scrim);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 16px;
	}
	.modal {
		background: var(--surface);
		width: 100%;
		max-width: 520px;
		max-height: 82vh;
		border-radius: var(--r-modal);
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 16px 18px;
		border-bottom: 1px solid var(--border);
	}
	.kicker {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-2);
	}
	.title {
		font-size: 16px;
		font-weight: 700;
		color: oklch(0.27 0.012 70);
		margin-top: 1px;
	}
	.done {
		font-size: 13px;
		font-weight: 600;
		color: var(--brand);
		background: oklch(0.95 0.014 220);
		border: none;
		border-radius: var(--r-sm);
		padding: 8px 14px;
		cursor: pointer;
	}
	.filter {
		padding: 12px 18px;
		border-bottom: 1px solid var(--border-soft);
	}
	.list {
		overflow-y: auto;
		padding: 12px 18px 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-card);
		padding: 12px 13px;
		cursor: pointer;
		text-align: left;
	}
	.row.used {
		opacity: 0.5;
		cursor: default;
		filter: saturate(0.4);
	}
	.emoji {
		font-size: 21px;
		line-height: 1;
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.name-line {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.name {
		font-size: 14px;
		font-weight: 600;
		color: oklch(0.25 0.012 70);
	}
	.reuse {
		font-size: 12px;
		color: oklch(0.55 0.05 150);
	}
	.plus {
		font-size: 22px;
		color: var(--action);
		width: 30px;
		height: 30px;
		border-radius: var(--r-sm);
		background: oklch(0.95 0.014 220);
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
	}
	.planned {
		font-size: 10px;
		font-weight: 700;
		color: oklch(0.5 0.06 150);
		white-space: nowrap;
	}
</style>
