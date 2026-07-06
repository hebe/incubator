<script lang="ts">
	import type { Energy } from '$lib/types';
	import { energyColor, durationWeight } from '$lib/data/derive';

	// When durationLabel is given, the leading marker becomes a vertical bar whose height
	// encodes how much of the day the activity fills (full > half > hourly), coloured by
	// energy. Without it, falls back to the plain energy dot.
	let {
		energy,
		text,
		size = 'sm',
		durationLabel
	}: { energy: Energy; text: string; size?: 'sm' | 'md'; durationLabel?: string } = $props();

	const weight = $derived(durationLabel ? durationWeight(durationLabel) : null);
</script>

<div class="meta" class:md={size === 'md'}>
	{#if weight}
		<span class="bar bar-{weight}" style="background:{energyColor(energy)};"></span>
	{:else}
		<span class="dot" style="background:{energyColor(energy)};"></span>
	{/if}{text}
</div>

<style>
	.meta {
		font-size: 11px;
		color: var(--text-2);
		margin-top: 2px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.meta.md {
		font-size: 12px;
	}
	.dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.bar {
		display: inline-block;
		width: 4px;
		border-radius: 2px;
		flex: 0 0 auto;
	}
	.bar-short {
		height: 9px;
	}
	.bar-medium {
		height: 30px;
	}
	.bar-long {
		height: 100px;
	}
</style>
