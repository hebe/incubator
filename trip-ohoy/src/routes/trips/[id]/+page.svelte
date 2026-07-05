<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { PlannerStore } from '$lib/stores/planner.svelte';
	import { seedIfEmpty } from '$lib/data/local';
	import { rangeSubtitle, weekdayFull, dateLong, moodOf } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import DayColumn from '$lib/components/DayColumn.svelte';
	import BankCard from '$lib/components/BankCard.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import BaseChip from '$lib/components/BaseChip.svelte';
	import MoodChip from '$lib/components/MoodChip.svelte';
	import PickerModal from '$lib/components/PickerModal.svelte';
	import DetailModal from '$lib/components/DetailModal.svelte';
	import ActivityForm from '$lib/components/ActivityForm.svelte';
	import BasesModal from '$lib/components/BasesModal.svelte';
	import EditTripModal from '$lib/components/EditTripModal.svelte';

	const store = new PlannerStore();

	onMount(async () => {
		await seedIfEmpty();
		const id = page.params.id;
		if (id) await store.load(id);
	});

	const trip = $derived(store.trip);
	const used = $derived(store.usedActivityIds);
	const summary = $derived(store.summary);
	const selectedDay = $derived(store.days.find((d) => d.id === store.selectedDayId));
	const selectedLabel = $derived(selectedDay ? `${weekdayFull(selectedDay.date)} ${dateLong(selectedDay.date)}` : '');
</script>

{#if store.loaded && trip}
	<div class="app">
		<!-- Sticky header -->
		<header>
			<div class="header-left">
				<a class="back" href="/">{t.back}</a>
				<div class="brand">
					<div class="wordmark">{trip.destination.toUpperCase()}</div>
					<div class="subtitle">
						{rangeSubtitle(trip.startDate, trip.endDate)}
						<button class="bases-btn" onclick={store.openEditTrip}>edit</button>
						<button class="bases-btn" onclick={store.openBasesManager}>bases</button>
					</div>
				</div>
			</div>
			<div class="header-right">
				<div class="pills">
					<span class="pill">📋 {t.activitiesCount(summary.planned)}</span>
					<span class="pill">🚗 {t.carDays(summary.carDays)}</span>
				</div>
				<div class="tabs">
					<button class:active={store.view === 'board'} onclick={() => store.setView('board')}>{t.overview}</button>
					<button class:active={store.view === 'list'} onclick={() => store.setView('list')}>{t.dayList}</button>
				</div>
				<button
					class="sync-btn"
					class:syncing={store.syncStatus === 'syncing'}
					class:error={store.syncStatus === 'error'}
					onclick={() => store.sync()}
					title="Sync to cloud"
				>
					{store.syncStatus === 'syncing' ? '↻' : store.syncStatus === 'error' ? '⚠' : store.syncStatus === 'synced' ? '✓' : '☁'}
				</button>
			</div>
		</header>

		{#if store.view === 'board'}
			<!-- Board -->
			<div class="hint">{t.boardHint}</div>
			<div class="columns">
				{#each store.days as day (day.id)}
					<DayColumn {store} {day} />
				{/each}
			</div>

			<!-- Activity bank -->
			<section class="bank">
				<div class="bank-head">
					<div>
						<div class="bank-title">{t.bankTitle}</div>
						<div class="bank-sub">
							{t.addingTo} <strong>{selectedLabel}</strong> · {t.bankSubtitlePrefix}
						</div>
					</div>
					<div class="bank-head-right">
						<div class="legend">
							<span>{t.legendGoodWeather}</span><span>{t.legendRainy}</span>
							<span>{t.legendCar}</span><span>{t.legendReusable}</span>
						</div>
						<button class="new-activity-btn" onclick={store.openNewActivity}>{t.newActivityBtn}</button>
					</div>
				</div>
				<div class="bank-filter"><CategoryFilter filter={store.filter} onselect={store.setFilter} /></div>
				<div class="bank-grid">
					{#each store.bankActivities as a (a.id)}
						<BankCard
							activity={a}
							used={!a.reusable && used.has(a.id)}
							onadd={() => store.selectedDayId && store.addActivity(store.selectedDayId, a.id)}
							onopendetail={(e) => { e.stopPropagation(); store.openDetail(a.id); }}
							ontoggleconfirmed={(e) => { e.stopPropagation(); store.toggleConfirmed(a.id); }}
						/>
					{/each}
				</div>
			</section>
		{:else}
			<!-- Mobile day list -->
			<div class="list-view">
				{#each store.days as day (day.id)}
					{@const byId = store.activityById}
					{@const items = store
						.placementsForDay(day.id)
						.map((p) => ({ placement: p, activity: byId.get(p.activityId)! }))
						.filter((x) => x.activity)}
					{@const base = day.baseId ? store.baseById.get(day.baseId) : undefined}
					{@const needsCar = items.some((x) => x.activity.needsCar)}
					{@const mood = moodOf(items.map((x) => x.activity.energy))}
					<div class="day-section">
						<div class="day-head">
							<div class="day-date">
								<span class="d">{dateLong(day.date)}</span>
								<span class="wd">{weekdayFull(day.date)}</span>
							</div>
							<div class="day-meta">
								{#if mood}<MoodChip {mood} />{/if}
								<BaseChip {base} onclick={() => store.cycleBase(day.id)} />
								{#if needsCar}<span class="car">🚗</span>{/if}
							</div>
						</div>
						<div class="day-rows">
							{#each items as x (x.placement.id)}
								<ListRow
									activity={x.activity}
									onopen={() => store.openDetail(x.activity.id)}
									onremove={(e) => {
										e.stopPropagation();
										store.removePlacement(x.placement.id);
									}}
								/>
							{/each}
							{#if items.length === 0}<div class="empty">{t.emptyDayList}</div>{/if}
						</div>
						<button class="add-day" onclick={() => store.openPicker(day.id)}>{t.addActivity}</button>
					</div>
				{/each}
			</div>
		{/if}

		<PickerModal {store} />
		<DetailModal {store} />
		{#if store.activityFormMode !== 'closed'}
			{#key store.activityFormMode}
				<ActivityForm {store} />
			{/key}
		{/if}
		{#if store.basesOpen}
			<BasesModal {store} />
		{/if}
		{#if store.editTripOpen}
			{#key trip.id}
				<EditTripModal {store} />
			{/key}
		{/if}
	</div>
{/if}

<style>
	/* clip (not hidden) kills any horizontal bleed without creating a scroll container,
	   so the sticky header and the board's own horizontal scroll both keep working. */
	.app {
		overflow-x: clip;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding: 16px 24px;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		position: sticky;
		top: 0;
		z-index: 20;
	}
	.header-left {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.back {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--text-2);
		text-decoration: none;
		margin-bottom: 2px;
	}
	.back:hover {
		color: var(--action);
	}
	.brand {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.bases-btn {
		margin-left: 8px;
		font-size: 11px;
		font-weight: 600;
		color: var(--action);
		background: var(--action-soft-bg);
		border: 1px solid var(--action-soft-border);
		border-radius: var(--r-chip);
		padding: 2px 8px;
		cursor: pointer;
		vertical-align: middle;
	}
	.wordmark {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--brand);
	}
	.subtitle {
		font-size: 12.5px;
		color: var(--text-2);
	}
	.header-right {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	.pills {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 11.5px;
		font-weight: 600;
		color: oklch(0.46 0.012 70);
	}
	.pill {
		background: oklch(0.96 0.006 85);
		border: 1px solid oklch(0.91 0.01 85);
		border-radius: var(--r-chip);
		padding: 4px 11px;
	}
	.tabs {
		display: flex;
		background: oklch(0.95 0.006 85);
		border-radius: 10px;
		padding: 3px;
		gap: 2px;
	}
	.tabs button {
		font-size: 13px;
		font-weight: 600;
		padding: 7px 16px;
		border-radius: var(--r-sm);
		border: none;
		cursor: pointer;
		background: transparent;
		color: oklch(0.46 0.012 70);
	}
	.tabs button.active {
		background: var(--surface);
		color: oklch(0.3 0.05 220);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
	}
	.sync-btn {
		font-size: 16px;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-2);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.15s, border-color 0.15s;
	}
	.sync-btn.syncing {
		color: var(--action);
		border-color: var(--action);
		animation: spin 1s linear infinite;
	}
	.sync-btn.error {
		color: oklch(0.55 0.18 30);
		border-color: oklch(0.55 0.18 30);
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.hint {
		padding: 16px 24px 4px;
		font-size: 12.5px;
		color: var(--text-2);
	}
	.columns {
		display: flex;
		gap: 12px;
		overflow-x: auto;
		padding: 12px 24px 22px;
		align-items: flex-start;
	}
	.bank {
		border-top: 1px solid var(--border);
		background: var(--surface-2);
		padding: 18px 24px 30px;
	}
	.bank-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 14px;
		flex-wrap: wrap;
		margin-bottom: 13px;
	}
	.bank-head-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
	}
	.new-activity-btn {
		font-size: 13px;
		font-weight: 700;
		color: #fff;
		background: var(--action);
		border: none;
		border-radius: var(--r-chip);
		padding: 8px 16px;
		cursor: pointer;
		white-space: nowrap;
	}
	.bank-title {
		font-size: 15px;
		font-weight: 700;
		color: oklch(0.28 0.012 70);
	}
	.bank-sub {
		font-size: 12px;
		color: var(--text-2);
		margin-top: 2px;
	}
	.bank-sub strong {
		color: var(--brand);
	}
	.legend {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 11px;
		color: var(--text-2);
		flex-wrap: wrap;
		max-width: 420px;
	}
	.bank-filter {
		margin-bottom: 15px;
	}
	.bank-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(228px, 1fr));
		gap: 10px;
	}
	.list-view {
		max-width: 560px;
		margin: 0 auto;
		padding: 6px 16px 48px;
	}
	.day-section {
		margin-top: 20px;
	}
	.day-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px 10px;
		flex-wrap: wrap;
		padding-bottom: 9px;
		border-bottom: 2px solid oklch(0.91 0.01 85);
	}
	.day-date {
		display: flex;
		align-items: baseline;
		gap: 9px;
	}
	.day-date .d {
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
	}
	.day-date .wd {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-2);
	}
	.day-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		min-width: 0;
	}
	.day-meta .car {
		font-size: 14px;
	}
	.day-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 11px;
	}
	.empty {
		font-size: 13px;
		color: var(--text-faint);
		padding: 14px 4px;
	}
	.add-day {
		margin-top: 10px;
		width: 100%;
		font-size: 13.5px;
		font-weight: 600;
		color: var(--action);
		background: var(--action-soft-bg);
		border: 1px solid var(--action-soft-border);
		border-radius: 10px;
		padding: 11px;
		cursor: pointer;
	}

	/* ── Mobile: tighten horizontal padding so nothing is cut off on narrow screens ── */
	@media (max-width: 640px) {
		header {
			padding: 14px 16px;
			gap: 12px;
		}
		.hint {
			padding: 14px 16px 4px;
		}
		.columns {
			padding: 12px 16px 22px;
		}
		.bank {
			padding: 16px 16px 28px;
		}
		.bank-grid {
			grid-template-columns: 1fr;
		}
		.list-view {
			padding: 6px 14px 44px;
		}
	}
</style>
