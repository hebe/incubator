<script lang="ts">
	// Card in the activity bank grid. Clicking adds to the selected day; can also be dragged
	// into a day column. One-time activities already placed are dimmed with a "Planned" pill.
	import type { Activity } from '$lib/types';
	import { CATEGORY_BY_KEY } from '$lib/data/catalog';
	import { badgesFor } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import Badges from './Badges.svelte';
	import EnergyMeta from './EnergyMeta.svelte';

	let {
		activity,
		used,
		onadd,
		onopendetail
	}: {
		activity: Activity;
		used: boolean;
		onadd: () => void;
		onopendetail: (e: MouseEvent) => void;
	} = $props();

	const cat = $derived(CATEGORY_BY_KEY[activity.category]);
	const hasBadges = $derived(badgesFor(activity).length > 0);

	function dragstart(e: DragEvent) {
		if (used || !e.dataTransfer) return;
		e.dataTransfer.setData('text/plain', activity.id);
		e.dataTransfer.effectAllowed = 'copy';
	}
</script>

<div
	class="card"
	class:used
	style="border-left:4px solid {cat.colorVar};"
	role="button"
	tabindex="0"
	draggable={!used}
	onclick={() => !used && onadd()}
	onkeydown={(e) => !used && (e.key === 'Enter' || e.key === ' ') && onadd()}
	ondragstart={dragstart}
>
	<div class="row">
		<span class="emoji">{activity.emoji}</span>
		<div class="body">
			<div class="name-line">
				<span class="name">{activity.name}</span>
				{#if activity.reusable}<span class="reuse" title={t.reusableTip}>↻</span>{/if}
			</div>
			<EnergyMeta
				energy={activity.energy}
				text={`${cat.label} · ${activity.durationLabel} · ${activity.energy}`}
			/>
			{#if hasBadges}<div class="badges-pad"><Badges {activity} /></div>{/if}
		</div>
	</div>

	{#if used}
		<div class="planned">{t.planned}</div>
	{:else}
		<button class="info" title={t.showDetails} onclick={onopendetail}>i</button>
	{/if}
</div>

<style>
	.card {
		position: relative;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 12px;
		cursor: pointer;
		transition:
			transform 0.12s,
			box-shadow 0.12s;
	}
	.card:not(.used):hover {
		transform: translateY(-1px);
		box-shadow: 0 5px 16px rgba(0, 0, 0, 0.08);
	}
	.card.used {
		opacity: 0.5;
		cursor: default;
		filter: saturate(0.4);
	}
	.row {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}
	.emoji {
		font-size: 20px;
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
		font-size: 13.5px;
		font-weight: 600;
		color: oklch(0.25 0.012 70);
	}
	.reuse {
		font-size: 12px;
		color: oklch(0.55 0.05 150);
	}
	.badges-pad {
		margin-top: 8px;
	}
	.planned {
		position: absolute;
		top: 9px;
		right: 9px;
		font-size: 10px;
		font-weight: 700;
		color: oklch(0.5 0.06 150);
		background: oklch(0.94 0.04 150);
		padding: 2px 8px;
		border-radius: var(--r-chip);
	}
	.info {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 23px;
		height: 23px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--surface);
		color: oklch(0.46 0.05 230);
		font-size: 13px;
		font-weight: 700;
		font-style: italic;
		font-family: Georgia, serif;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.info:hover {
		background: oklch(0.95 0.014 230);
	}
</style>
