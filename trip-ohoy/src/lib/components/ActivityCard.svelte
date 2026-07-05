<script lang="ts">
	// Placed activity card inside a board day column.
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
	class="card"
	style="border-left:3px solid {color};{activity.confirmed ? `background:color-mix(in oklch, ${color} 10%, white);` : ''}"
	role="button"
	tabindex="0"
	title={t.showDetails}
	onclick={onopen}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onopen()}
>
	<div class="row">
		<span class="emoji">{activity.emoji}</span>
		<div class="body">
			<div class="name">{activity.name}</div>
			<EnergyMeta energy={activity.energy} text={`${activity.durationLabel} · ${activity.energy}`} />
		</div>
		<span class="chevron">›</span>
		<button class="x" title={t.remove} onclick={onremove}>×</button>
	</div>
	{#if hasBadges}<div class="badges-pad"><Badges {activity} /></div>{/if}
</div>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		padding: 8px 9px;
		cursor: pointer;
		transition: border-color 0.12s;
	}
	.card:hover {
		border-color: oklch(0.78 0.03 220);
	}
	.row {
		display: flex;
		align-items: flex-start;
		gap: 7px;
	}
	.emoji {
		font-size: 15px;
		line-height: 1.1;
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.name {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text);
		line-height: 1.25;
	}
	.chevron {
		font-size: 12px;
		color: var(--text-faint);
		line-height: 1;
		align-self: center;
	}
	.x {
		border: none;
		background: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		padding: 0 1px;
	}
	.badges-pad {
		padding-left: 22px;
		margin-top: 6px;
	}
</style>
