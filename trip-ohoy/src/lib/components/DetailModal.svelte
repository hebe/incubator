<script lang="ts">
	import type { PlannerStore } from '$lib/stores/planner.svelte';
	import { CATEGORY_BY_KEY } from '$lib/data/catalog';
	import { hostOf, mapsLink } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import Badges from './Badges.svelte';
	import Minimap from './Minimap.svelte';

	let { store }: { store: PlannerStore } = $props();

	const activity = $derived(
		store.detailActivityId ? store.activityById.get(store.detailActivityId) : undefined
	);
	const cat = $derived(activity ? CATEGORY_BY_KEY[activity.category] : undefined);
	const meta = $derived(activity ? store.metaFor(activity.id) : undefined);
	const destination = $derived(store.trip?.destination ?? '');

	function onLinkKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && activity) {
			e.preventDefault();
			store.addLink(activity.id);
		}
	}
</script>

{#if activity && cat && meta}
	<div
		class="scrim"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && store.closeDetail()}
	>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="head">
				<span class="emoji">{activity.emoji}</span>
				<div class="head-body">
					<div class="name">{activity.name}</div>
					<div class="head-meta">
						<span class="cat-chip" style="color:{cat.colorVar};">
							<span class="cat-dot" style="background:{cat.colorVar};"></span>{cat.label}
						</span>
						<span class="dur">{activity.durationLabel} · {activity.energy}</span>
						{#if activity.reusable}<span class="reuse">{t.reusableLabel}</span>{/if}
					</div>
					<div class="head-badges"><Badges {activity} size="md" /></div>
				</div>
				<button class="close" onclick={store.closeDetail}>×</button>
			</div>

			<div class="scroll">
				<div class="map-block">
					<Minimap lat={activity.lat} lng={activity.lng} colorVar={cat.colorVar} />
					<div class="where">
						<div class="kicker">{t.whereLabelPrefix} {destination}</div>
						<div class="place">📍 {activity.placeLabel}</div>
						<a class="maps" href={mapsLink(activity.placeLabel, destination)} target="_blank" rel="noopener">
							{t.openInMaps}
						</a>
					</div>
				</div>

				<div class="section">
					<div class="kicker">{t.linksTitle}</div>
					{#if meta.links.length}
						<div class="links">
							{#each meta.links as lnk, i (i)}
								<div class="link-row">
									<a class="link" href={lnk.url} target="_blank" rel="noopener">
										<div class="link-label">{lnk.label} ↗</div>
										<div class="link-host">{hostOf(lnk.url)}</div>
									</a>
									<button class="x" title={t.removeLink} onclick={() => store.removeLink(activity.id, i)}>×</button>
								</div>
							{/each}
						</div>
					{/if}
					<div class="add-link">
						<input
							class="in label"
							placeholder={t.linkTitlePlaceholder}
							bind:value={store.linkDraft.label}
							onkeydown={onLinkKey}
						/>
						<input
							class="in url"
							placeholder={t.linkUrlPlaceholder}
							bind:value={store.linkDraft.url}
							onkeydown={onLinkKey}
						/>
						<button class="add-btn" onclick={() => store.addLink(activity.id)}>{t.linkAdd}</button>
					</div>
				</div>

				<div class="section">
					<div class="kicker">{t.notesTitle}</div>
					<textarea
						class="notes"
						placeholder={t.notesPlaceholder}
						value={meta.notes}
						oninput={(e) => store.setNotes(activity.id, e.currentTarget.value)}
					></textarea>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: var(--scrim);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 60;
		padding: 16px;
	}
	.modal {
		background: var(--surface);
		width: 100%;
		max-width: 540px;
		max-height: 88vh;
		border-radius: var(--r-modal);
		display: flex;
		flex-direction: column;
		box-shadow: 0 22px 64px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: flex-start;
		gap: 13px;
		padding: 18px 18px 14px;
		border-bottom: 1px solid var(--border-soft);
	}
	.emoji {
		font-size: 30px;
		line-height: 1;
	}
	.head-body {
		flex: 1;
		min-width: 0;
	}
	.name {
		font-size: 18px;
		font-weight: 700;
		color: oklch(0.25 0.012 70);
		line-height: 1.2;
	}
	.head-meta {
		display: flex;
		align-items: center;
		gap: 7px;
		flex-wrap: wrap;
		margin-top: 7px;
	}
	.cat-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: var(--r-chip);
		background: oklch(0.96 0.006 85);
		border: 1px solid var(--border);
	}
	.cat-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.dur {
		font-size: 12px;
		color: var(--text-2);
	}
	.reuse {
		font-size: 11px;
		font-weight: 600;
		color: oklch(0.5 0.06 150);
	}
	.head-badges {
		margin-top: 9px;
	}
	.close {
		border: none;
		background: oklch(0.95 0.006 85);
		color: oklch(0.4 0.012 70);
		width: 30px;
		height: 30px;
		border-radius: 9px;
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		flex: 0 0 auto;
	}
	.scroll {
		overflow-y: auto;
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.map-block {
		display: flex;
		gap: 16px;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.where {
		flex: 1;
		min-width: 160px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 2px;
	}
	.kicker {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-2);
	}
	.place {
		font-size: 16px;
		font-weight: 700;
		color: oklch(0.28 0.012 70);
	}
	.maps {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 13px;
		font-weight: 600;
		color: var(--action);
		text-decoration: none;
		background: oklch(0.96 0.014 230);
		border: 1px solid oklch(0.9 0.02 230);
		border-radius: 9px;
		padding: 9px 12px;
		align-self: flex-start;
		margin-top: 2px;
	}
	.section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.links {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.link-row {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 9px 11px;
	}
	.link {
		flex: 1;
		min-width: 0;
		text-decoration: none;
	}
	.link-label {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--action);
	}
	.link-host {
		font-size: 11px;
		color: var(--text-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.x {
		border: none;
		background: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 17px;
		line-height: 1;
		padding: 0 2px;
	}
	.add-link {
		display: flex;
		gap: 7px;
		flex-wrap: wrap;
		align-items: center;
	}
	.in {
		font-family: inherit;
		font-size: 13px;
		color: var(--text);
		background: oklch(0.99 0.004 90);
		border: 1px solid oklch(0.89 0.01 85);
		border-radius: 9px;
		padding: 9px 11px;
		outline: none;
	}
	.in.label {
		flex: 1;
		min-width: 120px;
	}
	.in.url {
		flex: 2;
		min-width: 160px;
	}
	.add-btn {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		background: var(--action);
		border: none;
		border-radius: 9px;
		padding: 9px 15px;
		cursor: pointer;
		flex: 0 0 auto;
	}
	.notes {
		width: 100%;
		min-height: 96px;
		resize: vertical;
		font-family: inherit;
		font-size: 13.5px;
		line-height: 1.5;
		color: var(--text);
		background: oklch(0.99 0.004 90);
		border: 1px solid oklch(0.89 0.01 85);
		border-radius: 11px;
		padding: 11px 12px;
		outline: none;
	}
</style>
