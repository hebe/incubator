<script lang="ts">
	import type { Activity } from '$lib/types';
	import { badgesFor, BADGE_COLORS } from '$lib/data/derive';

	let { activity, size = 'sm' }: { activity: Activity; size?: 'sm' | 'md' } = $props();
	const badges = $derived(badgesFor(activity));
</script>

{#if badges.length}
	<div class="badges" class:md={size === 'md'}>
		{#each badges as b (b.kind)}
			<span
				class="badge"
				style="background:{BADGE_COLORS[b.kind][0]};color:{BADGE_COLORS[b.kind][1]};">{b.label}</span
			>
		{/each}
	</div>
{/if}

<style>
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.badges.md {
		gap: 5px;
	}
	.badge {
		font-size: 10.5px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: var(--r-chip);
		white-space: nowrap;
	}
</style>
