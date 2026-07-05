<script lang="ts">
	// Placed activity row in the mobile day list (larger than the board card).
	import type { Activity } from '$lib/types';
	import { CATEGORY_BY_KEY } from '$lib/data/catalog';
	import { badgesFor } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import Badges from './Badges.svelte';
	import EnergyMeta from './EnergyMeta.svelte';

	let {
		activity,
		onopen,
		onremove
	}: { activity: Activity; onopen: () => void; onremove: (e: MouseEvent) => void } = $props();

	const color = $derived(CATEGORY_BY_KEY[activity.category].colorVar);
	const hasBadges = $derived(badgesFor(activity).length > 0);
</script>

<div
	class="row"
	style="border-left:4px solid {color};{activity.confirmed ? `background:color-mix(in oklch, ${color} 10%, white);` : ''}"
	role="button"
	tabindex="0"
	title={t.showDetails}
	onclick={onopen}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onopen()}
>
	<span class="emoji">{activity.emoji}</span>
	<div class="body">
		<div class="name-line"><span class="name">{activity.name}</span><span class="chevron">›</span></div>
		<EnergyMeta energy={activity.energy} durationLabel={activity.durationLabel} text={`${activity.durationLabel} · ${activity.energy}`} size="md" />
		{#if hasBadges}<div class="badges-pad"><Badges {activity} size="md" /></div>{/if}
	</div>
	<button class="x" title={t.remove} onclick={onremove}>×</button>
</div>

<style>
	.row {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		max-width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-card);
		padding: 13px 14px;
		cursor: pointer;
	}
	.emoji {
		font-size: 22px;
		line-height: 1;
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.name-line {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.name {
		font-size: 14.5px;
		font-weight: 600;
		color: oklch(0.25 0.012 70);
	}
	.chevron {
		font-size: 13px;
		color: var(--text-faint);
	}
	.badges-pad {
		margin-top: 8px;
	}
	.x {
		border: none;
		background: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		padding: 0 2px;
		align-self: flex-start;
	}
</style>
