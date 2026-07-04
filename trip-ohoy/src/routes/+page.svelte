<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { seedIfEmpty } from '$lib/data/local';
	import { TripsStore } from '$lib/stores/trips.svelte';
	import { rangeSubtitle } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import TripForm from '$lib/components/TripForm.svelte';

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
</script>

<div class="page">
	<header>
		<div class="wordmark">trip ohoy</div>
		<button class="new-btn" onclick={() => (showForm = true)}>{t.newTrip}</button>
	</header>

	{#if store.loaded}
		{#if store.trips.length === 0}
			<div class="empty">{t.tripsEmpty}</div>
		{:else}
			<div class="grid">
				{#each store.trips as trip (trip.id)}
					<a class="card" href="/trips/{trip.id}">
						<div class="dest">{trip.destination.toUpperCase()}</div>
						<div class="sub">{rangeSubtitle(trip.startDate, trip.endDate)}</div>
						<div class="chip">{t.days(store.dayCount(trip))}</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
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
		padding: 20px 28px;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.wordmark {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: 0.05em;
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
	.empty {
		padding: 60px 28px;
		text-align: center;
		font-size: 15px;
		color: var(--text-faint);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 14px;
		padding: 28px;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 7px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 20px;
		text-decoration: none;
		transition: box-shadow 0.12s, transform 0.12s;
	}
	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
	}
	.dest {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--brand);
	}
	.sub {
		font-size: 13px;
		color: var(--text-2);
	}
	.chip {
		display: inline-flex;
		align-self: flex-start;
		font-size: 11.5px;
		font-weight: 600;
		color: oklch(0.46 0.012 70);
		background: oklch(0.96 0.006 85);
		border: 1px solid oklch(0.91 0.01 85);
		border-radius: var(--r-chip);
		padding: 3px 10px;
		margin-top: 2px;
	}
</style>
