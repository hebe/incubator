<script lang="ts">
	// M1 has a single seeded trip; the root just ensures it exists and lands on the planner.
	// M2 replaces this with the trip list.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { seedIfEmpty } from '$lib/data/local';

	onMount(async () => {
		const tripId = await seedIfEmpty();
		goto(`/trips/${tripId}`, { replaceState: true });
	});
</script>

<p style="padding:24px;color:var(--text-2);">Loading…</p>
