<script lang="ts">
	// Modal form for creating and editing activities. Opened from the bank (create)
	// or from DetailModal's edit button (edit). Uses {#key} in the parent to remount
	// on each open so local state initialises fresh from the existing activity.
	import { untrack } from 'svelte';
	import type { PlannerStore } from '$lib/stores/planner.svelte';
	import { CATEGORIES, CATEGORY_BY_KEY } from '$lib/data/catalog';
	import type { CategoryKey, Energy, Weather } from '$lib/types';
	import { t } from '$lib/i18n/strings';
	import MapPicker from './MapPicker.svelte';

	let { store }: { store: PlannerStore } = $props();

	const isEdit = $derived(
		store.activityFormMode !== 'closed' && store.activityFormMode !== 'create'
	);
	const existing = $derived(
		isEdit ? store.activityById.get(store.activityFormMode as string) : undefined
	);

	// Form state — initialised by the parent's {#key} remount trick.
	// Captured into `init` first so $state() reads a plain value, not a reactive derived.
	const init = untrack(() => existing);
	let emoji = $state(init?.emoji ?? '✈️');
	let name = $state(init?.name ?? '');
	let category = $state<CategoryKey>(init?.category ?? 'sight');
	let durationLabel = $state(init?.durationLabel ?? 'Full day');
	let energy = $state<Energy>(init?.energy ?? 'Medium');
	let weather = $state<Weather>(init?.weather ?? 'any');
	let needsCar = $state(init?.needsCar ?? false);
	let reusable = $state(init?.reusable ?? false);
	let confirmed = $state(init?.confirmed ?? false);
	let placeLabel = $state(init?.placeLabel ?? '');
	let lat = $state(init?.lat ?? 0);
	let lng = $state(init?.lng ?? 0);

	const catColorVar = $derived(CATEGORY_BY_KEY[category]?.colorVar ?? 'var(--action)');
	const canSave = $derived(name.trim().length > 0);

	const DURATION_PRESETS = ['Full day', 'Half day', '2–3 hours', '1 hour', '30 min', 'Evening', 'Morning'];

	async function save() {
		if (!canSave) return;
		await store.saveActivity(
			{ emoji, name: name.trim(), category, durationLabel, energy, weather, needsCar, reusable, confirmed, placeLabel, lat, lng },
			isEdit ? (store.activityFormMode as string) : undefined
		);
	}

	async function del() {
		if (!isEdit) return;
		if (!confirm(t.deleteActivityConfirm)) return;
		await store.deleteActivity(store.activityFormMode as string);
	}
</script>

<div class="scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && store.closeActivityForm()}>
	<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
		<div class="head">
			<div class="title">{isEdit ? t.editActivityTitle : t.newActivityTitle}</div>
			<button class="close" onclick={store.closeActivityForm}>×</button>
		</div>

		<div class="scroll">
			<!-- Emoji + Name -->
			<div class="row">
				<div class="field">
					<label class="lbl" for="af-emoji">{t.emojiLabel}</label>
					<input id="af-emoji" class="in emoji-in" bind:value={emoji} maxlength={4} />
				</div>
				<div class="field grow">
					<label class="lbl" for="af-name">{t.activityNameLabel}</label>
					<input id="af-name" class="in" bind:value={name} placeholder={t.activityNamePlaceholder} />
				</div>
			</div>

			<!-- Category -->
			<div class="field">
				<div class="lbl">{t.categoryLabel}</div>
				<div class="cat-grid">
					{#each CATEGORIES as cat}
						<button
							class="cat-btn"
							class:active={category === cat.key}
							style={category === cat.key ? `background:${cat.colorVar};color:#fff;border-color:${cat.colorVar};` : `border-color:${cat.colorVar};color:${cat.colorVar};`}
							onclick={() => (category = cat.key)}
						>
							{cat.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Duration + Energy -->
			<div class="row">
				<div class="field grow">
					<label class="lbl" for="af-duration">{t.durationLabel}</label>
					<input id="af-duration" class="in" list="dur-list" bind:value={durationLabel} placeholder={t.durationPlaceholder} />
					<datalist id="dur-list">
						{#each DURATION_PRESETS as d}<option value={d}></option>{/each}
					</datalist>
				</div>
				<div class="field">
					<div class="lbl">{t.energyLabel}</div>
					<div class="seg">
						{#each ['Low', 'Medium', 'High'] as e}
							<button class="seg-btn" class:active={energy === e} onclick={() => (energy = e as Energy)}>{e}</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Weather -->
			<div class="field">
				<div class="lbl">{t.weatherLabel}</div>
				<div class="seg">
					<button class="seg-btn" class:active={weather === 'good'} onclick={() => (weather = 'good')}>☀️ Good weather</button>
					<button class="seg-btn" class:active={weather === 'rainy'} onclick={() => (weather = 'rainy')}>🌧️ Rainy day</button>
					<button class="seg-btn" class:active={weather === 'any'} onclick={() => (weather = 'any')}>Any</button>
				</div>
			</div>

			<!-- Toggles -->
			<div class="toggles">
				<label class="toggle"><input type="checkbox" bind:checked={needsCar} /><span>🚗 {t.needsCarLabel}</span></label>
				<label class="toggle"><input type="checkbox" bind:checked={reusable} /><span>↻ {t.reusableLabel2}</span></label>
				<label class="toggle"><input type="checkbox" bind:checked={confirmed} /><span>✓ {t.confirmedLabel}</span></label>
			</div>

			<!-- Place label -->
			<div class="field">
				<label class="lbl" for="af-place">{t.placeLabelField}</label>
				<input id="af-place" class="in" bind:value={placeLabel} placeholder="e.g. Tamarin Bay (west)" />
			</div>

			<!-- Map picker -->
			<div class="field">
				<div class="lbl">{t.locationLabel}</div>
				<MapPicker bind:lat bind:lng colorVar={catColorVar} />
			</div>
		</div>

		<div class="foot">
			{#if isEdit}
				<button class="delete-btn" onclick={del}>{t.deleteActivity}</button>
			{/if}
			<div class="foot-right">
				<button class="cancel-btn" onclick={store.closeActivityForm}>{t.cancel}</button>
				<button class="save-btn" disabled={!canSave} onclick={save}>{t.saveActivity}</button>
			</div>
		</div>
	</div>
</div>

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
		max-width: 580px;
		max-height: 90vh;
		border-radius: var(--r-modal);
		display: flex;
		flex-direction: column;
		box-shadow: 0 22px 64px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 18px 14px;
		border-bottom: 1px solid var(--border-soft);
		flex: 0 0 auto;
	}
	.title {
		font-size: 16px;
		font-weight: 700;
		color: oklch(0.25 0.012 70);
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
	}
	.scroll {
		overflow-y: auto;
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.row {
		display: flex;
		gap: 12px;
		align-items: flex-end;
		flex-wrap: wrap;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.grow {
		flex: 1;
		min-width: 140px;
	}
	.lbl {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-2);
	}
	.in {
		font-family: inherit;
		font-size: 14px;
		color: var(--text);
		background: oklch(0.99 0.004 90);
		border: 1px solid oklch(0.89 0.01 85);
		border-radius: 9px;
		padding: 9px 11px;
		outline: none;
	}
	.in:focus {
		border-color: var(--action);
	}
	.emoji-in {
		width: 60px;
		font-size: 22px;
		text-align: center;
		padding: 7px 8px;
	}
	.cat-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.cat-btn {
		font-size: 12px;
		font-weight: 600;
		padding: 5px 12px;
		border-radius: var(--r-chip);
		border: 1.5px solid;
		background: transparent;
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
	}
	.seg {
		display: flex;
		background: oklch(0.95 0.006 85);
		border-radius: 9px;
		padding: 3px;
		gap: 2px;
	}
	.seg-btn {
		font-family: inherit;
		font-size: 12.5px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: 7px;
		border: none;
		cursor: pointer;
		background: transparent;
		color: oklch(0.46 0.012 70);
		white-space: nowrap;
	}
	.seg-btn.active {
		background: var(--surface);
		color: oklch(0.3 0.05 220);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
	}
	.toggles {
		display: flex;
		gap: 18px;
		flex-wrap: wrap;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 13.5px;
		font-weight: 600;
		color: oklch(0.35 0.012 70);
		cursor: pointer;
	}
	.toggle input {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--action);
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		border-top: 1px solid var(--border-soft);
		flex: 0 0 auto;
		gap: 10px;
	}
	.foot-right {
		display: flex;
		gap: 8px;
		margin-left: auto;
	}
	.delete-btn {
		font-size: 13px;
		font-weight: 600;
		color: oklch(0.5 0.1 25);
		background: oklch(0.96 0.02 25);
		border: 1px solid oklch(0.88 0.04 25);
		border-radius: 9px;
		padding: 9px 14px;
		cursor: pointer;
	}
	.cancel-btn {
		font-size: 13px;
		font-weight: 600;
		color: oklch(0.46 0.012 70);
		background: oklch(0.95 0.006 85);
		border: 1px solid var(--border);
		border-radius: 9px;
		padding: 9px 14px;
		cursor: pointer;
	}
	.save-btn {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		background: var(--action);
		border: none;
		border-radius: 9px;
		padding: 9px 18px;
		cursor: pointer;
	}
	.save-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
</style>
