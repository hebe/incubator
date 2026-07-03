<script lang="ts">
	import type { Energy } from '$lib/types';
	import { energyColor } from '$lib/data/derive';

	let { energy, text, size = 'sm' }: { energy: Energy; text: string; size?: 'sm' | 'md' } = $props();
</script>

<div class="meta" class:md={size === 'md'}>
	<span class="dot" style="background:{energyColor(energy)};"></span>{text}
</div>

<style>
	.meta {
		font-size: 11px;
		color: var(--text-2);
		margin-top: 2px;
		display: flex;
		align-items: center;
		gap: 5px;
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
</style>
