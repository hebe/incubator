<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { seedIfEmpty } from '$lib/data/local';
	import { TripsStore } from '$lib/stores/trips.svelte';
	import { rangeSubtitle } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import TripForm from '$lib/components/TripForm.svelte';
	import type { Trip } from '$lib/types';

	const store = new TripsStore();
	let showForm = $state(false);

	onMount(async () => {
		await seedIfEmpty();
		await store.loadAll();
	});

	async function onTripCreated(tripId: string) {
		showForm = false;
		goto(`/trips/${tripId}`);
	}

	function tripStatus(trip: Trip): 'upcoming' | 'ongoing' | 'done' | 'planning' {
		if (!trip.startDate || !trip.endDate) return 'planning';
		const today = new Date().toISOString().slice(0, 10);
		if (trip.endDate < today) return 'done';
		if (trip.startDate > today) return 'upcoming';
		return 'ongoing';
	}

	const STATUS_LABEL = {
		upcoming: '✈ Upcoming',
		ongoing: '🌴 Ongoing',
		done: '✓ Done',
		planning: '📌 Planning'
	};

	const CARD_COLORS = [
		'oklch(0.72 0.12 220)',
		'oklch(0.70 0.13 150)',
		'oklch(0.68 0.14 35)',
		'oklch(0.65 0.12 300)',
		'oklch(0.70 0.11 260)',
		'oklch(0.67 0.13 60)',
	];

	function cardColor(destination: string) {
		const hash = [...destination].reduce((acc, c) => acc + c.charCodeAt(0), 0);
		return CARD_COLORS[hash % CARD_COLORS.length];
	}
</script>

<div class="page">
	<header>
		<div class="wordmark">trip ohoy ⛵</div>
		<button class="new-btn" onclick={() => (showForm = true)}>{t.newTrip}</button>
	</header>

	<main>
		{#if !store.loaded}
			<div class="loading">Loading…</div>
		{:else if store.trips.length === 0}
			<div class="empty">
				<div class="empty-icon">🗺️</div>
				<div class="empty-text">{t.tripsEmpty}</div>
				<button class="new-btn-empty" onclick={() => (showForm = true)}>{t.newTrip}</button>
			</div>
		{:else}
			<div class="grid">
				{#each store.trips as trip (trip.id)}
					{@const status = tripStatus(trip)}
					<a class="card" href="/trips/{trip.id}">
						<div
							class="card-img"
							style="background-color: {cardColor(trip.destination)}"
						>
							<span class="status status-{status}">{STATUS_LABEL[status]}</span>
						</div>
						<div class="card-body">
							<div class="dest">{trip.destination}</div>
							<div class="dates">{rangeSubtitle(trip.startDate, trip.endDate)}</div>
							<div class="meta">
								<span class="days-chip">{t.days(store.dayCount(trip))}</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if showForm}
	<TripForm onclose={() => (showForm = false)} oncreate={onTripCreated} />
{/if}

<style>
	.page {
		min-height: 100vh;
		background: var(--page-bg);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 28px;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.wordmark {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: var(--brand);
	}
	.new-btn {
		font-size: 13.5px;
		font-weight: 700;
		color: #fff;
		background: var(--action);
		border: none;
		border-radius: var(--r-chip);
		padding: 9px 18px;
		cursor: pointer;
	}
	main {
		padding: 32px 28px 48px;
		max-width: 1100px;
		margin: 0 auto;
	}
	.loading {
		padding: 60px;
		text-align: center;
		color: var(--text-faint);
		font-size: 14px;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 80px 28px;
		text-align: center;
	}
	.empty-icon {
		font-size: 48px;
	}
	.empty-text {
		font-size: 15px;
		color: var(--text-faint);
	}
	.new-btn-empty {
		font-size: 14px;
		font-weight: 700;
		color: #fff;
		background: var(--action);
		border: none;
		border-radius: var(--r-chip);
		padding: 11px 22px;
		cursor: pointer;
		margin-top: 8px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 20px;
	}
	.card {
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		overflow: hidden;
		text-decoration: none;
		transition: transform 0.15s, box-shadow 0.15s;
	}
	.card:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 32px rgba(0, 0, 0, 0.1);
	}
	.card-img {
		position: relative;
		height: 180px;
		background-size: cover;
		background-position: center;
		background-color: oklch(0.88 0.04 220);
	}
	.status {
		position: absolute;
		top: 12px;
		right: 12px;
		font-size: 11.5px;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: var(--r-chip);
		backdrop-filter: blur(6px);
	}
	.status-upcoming {
		background: oklch(0.25 0.06 230 / 0.75);
		color: #fff;
	}
	.status-ongoing {
		background: oklch(0.32 0.1 150 / 0.8);
		color: #fff;
	}
	.status-done {
		background: oklch(0.2 0.01 70 / 0.6);
		color: oklch(0.9 0.01 70);
	}
	.status-planning {
		background: oklch(0.3 0.08 60 / 0.75);
		color: #fff;
	}
	.card-body {
		padding: 18px 20px 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.dest {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 0.03em;
		color: var(--brand);
	}
	.dates {
		font-size: 13px;
		color: var(--text-2);
	}
	.meta {
		margin-top: 4px;
	}
	.days-chip {
		display: inline-block;
		font-size: 11.5px;
		font-weight: 600;
		color: oklch(0.46 0.012 70);
		background: oklch(0.96 0.006 85);
		border: 1px solid oklch(0.91 0.01 85);
		border-radius: var(--r-chip);
		padding: 3px 10px;
	}
</style>
