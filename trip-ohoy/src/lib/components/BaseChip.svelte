<script lang="ts">
	import type { Base } from '$lib/types';
	import { BASE_PALETTE } from '$lib/data/catalog';

	let { base, onclick }: { base: Base | undefined; onclick: (e: MouseEvent) => void } = $props();
	const palette = $derived(
		(base && BASE_PALETTE[base.colorToken]) ?? { color: 'var(--text-2)', bg: 'var(--surface-2)' }
	);
</script>

{#if base}
	<button
		type="button"
		{onclick}
		style="background:{palette.bg};color:{palette.color};"
		title="Change base">📍 {base.name}</button
	>
{/if}

<style>
	button {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 10.5px;
		font-weight: 600;
		padding: 3px 9px;
		border-radius: var(--r-chip);
		border: none;
		cursor: pointer;
	}
</style>
