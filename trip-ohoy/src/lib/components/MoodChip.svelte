<script lang="ts">
	import type { Mood } from '$lib/types';
	import { MOOD_COLOR } from '$lib/data/catalog';

	let { mood }: { mood: Mood } = $props();
	const [bg, color] = $derived(MOOD_COLOR[mood]);
</script>

<span style="background:{bg};color:{color};">{mood}</span>

<style>
	span {
		font-size: 10.5px;
		font-weight: 600;
		padding: 4px 9px;
		border-radius: var(--r-chip);
		align-self: flex-start;
		white-space: nowrap;
	}
</style>
