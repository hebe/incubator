<script lang="ts">
	import type { CategoryKey } from '$lib/types';
	import { CATEGORIES } from '$lib/data/catalog';
	import { t } from '$lib/i18n/strings';

	type Filter = CategoryKey | 'all';
	let { filter, onselect }: { filter: Filter; onselect: (f: Filter) => void } = $props();

	const options = $derived([
		{ key: 'all' as Filter, label: t.all, colorVar: null as string | null },
		...CATEGORIES.map((c) => ({ key: c.key as Filter, label: c.label, colorVar: c.colorVar }))
	]);
</script>

<!-- Chips on wide screens; a compact dropdown on mobile (swapped by CSS). -->
<div class="chips">
	{#each options as o (o.key)}
		<button
			type="button"
			class="chip"
			class:active={filter === o.key}
			onclick={() => onselect(o.key)}
		>
			{#if o.colorVar}<span class="dot" style="background:{o.colorVar};"></span>{/if}{o.label}
		</button>
	{/each}
</div>
<select
	class="filter-select"
	aria-label="Filter by category"
	value={filter}
	onchange={(e) => onselect(e.currentTarget.value as Filter)}
>
	{#each options as o (o.key)}
		<option value={o.key}>{o.label}</option>
	{/each}
</select>

<style>
	.chips {
		display: flex;
		gap: 7px;
		flex-wrap: wrap;
	}
	@media (max-width: 640px) {
		.chips {
			display: none;
		}
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		padding: 6px 13px;
		border-radius: var(--r-chip);
		cursor: pointer;
		background: oklch(0.975 0.006 85);
		color: var(--text-2);
		border: 1px solid var(--border);
	}
	.chip.active {
		background: oklch(0.32 0.05 220);
		color: #fff;
		border-color: transparent;
	}
	.dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
</style>
