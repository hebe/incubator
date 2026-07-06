<script lang="ts">
	// Filters the activity bank by how much of a day an activity takes. Mirrors the duration
	// bar in EnergyMeta: a short bar for a quick errand, taller for half/full day.
	import type { DurationWeight } from '$lib/data/derive';

	type LengthFilter = DurationWeight | 'all';
	let { value, onselect }: { value: LengthFilter; onselect: (f: LengthFilter) => void } = $props();

	const options: Array<{ key: LengthFilter; label: string }> = [
		{ key: 'all', label: 'Any length' },
		{ key: 'long', label: 'Full day' },
		{ key: 'medium', label: 'Half day' },
		{ key: 'short', label: 'Short' }
	];
</script>

<div class="chips">
	{#each options as o (o.key)}
		<button
			type="button"
			class="chip"
			class:active={value === o.key}
			onclick={() => onselect(o.key)}
		>
			{#if o.key !== 'all'}<span class="bar bar-{o.key}"></span>{/if}{o.label}
		</button>
	{/each}
</div>

<style>
	.chips {
		display: flex;
		gap: 7px;
		flex-wrap: wrap;
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
	.bar {
		display: inline-block;
		width: 3px;
		border-radius: 2px;
		flex: 0 0 auto;
		background: currentColor;
		opacity: 0.7;
	}
	.bar-short {
		height: 8px;
	}
	.bar-medium {
		height: 12px;
	}
	.bar-long {
		height: 16px;
	}
</style>
