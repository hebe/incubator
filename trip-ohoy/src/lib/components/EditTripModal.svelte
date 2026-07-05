<script lang="ts">
	// Edit an existing trip's destination and dates. Changing dates reconciles the day
	// columns (see updateTripDetails). Bases are managed separately via BasesModal.
	import type { PlannerStore } from '$lib/stores/planner.svelte';
	import { datesInRange } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';
	import { untrack } from 'svelte';

	let { store }: { store: PlannerStore } = $props();

	const trip = untrack(() => store.trip);
	let destination = $state(trip?.destination ?? '');
	let startDate = $state(trip?.startDate ?? '');
	let endDate = $state(trip?.endDate ?? '');
	let saving = $state(false);

	const dayCount = $derived(
		startDate && endDate && startDate <= endDate ? datesInRange(startDate, endDate).length : 0
	);
	const canSave = $derived(
		destination.trim().length > 0 && (!startDate || !endDate || startDate <= endDate)
	);

	async function save() {
		if (!canSave || saving) return;
		saving = true;
		try {
			await store.updateTrip({
				destination: destination.trim(),
				startDate,
				endDate
			});
		} finally {
			saving = false;
		}
	}
</script>

<div class="scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && store.closeEditTrip()}>
	<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
		<div class="head">
			<div class="title">{t.editTripTitle}</div>
			<button class="close" onclick={store.closeEditTrip}>×</button>
		</div>

		<div class="scroll">
			<div class="field">
				<label class="lbl" for="et-dest">{t.destinationLabel}</label>
				<input id="et-dest" class="in" bind:value={destination} placeholder={t.destinationPlaceholder} />
			</div>

			<div class="row">
				<div class="field grow">
					<label class="lbl" for="et-start">{t.departureDateLabel} <span class="opt">optional</span></label>
					<input id="et-start" class="in" type="date" bind:value={startDate} />
				</div>
				<div class="field grow">
					<label class="lbl" for="et-end">{t.returnDateLabel} <span class="opt">optional</span></label>
					<input id="et-end" class="in" type="date" bind:value={endDate} min={startDate} />
				</div>
				{#if dayCount > 0}
					<div class="day-count">{t.days(dayCount)}</div>
				{/if}
			</div>

			<p class="note">{t.editTripDatesNote}</p>
		</div>

		<div class="foot">
			<button class="cancel-btn" onclick={store.closeEditTrip}>{t.cancel}</button>
			<button class="save-btn" disabled={!canSave || saving} onclick={save}>
				{saving ? '…' : t.saveChanges}
			</button>
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
		max-width: 480px;
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
		min-width: 120px;
	}
	.lbl {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-2);
	}
	.opt {
		font-weight: 400;
		text-transform: none;
		letter-spacing: 0;
		color: var(--text-faint);
		font-style: italic;
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
		width: 100%;
		box-sizing: border-box;
	}
	.in:focus {
		border-color: var(--action);
	}
	.day-count {
		font-size: 13px;
		font-weight: 700;
		color: var(--brand);
		align-self: center;
		padding-bottom: 2px;
	}
	.note {
		font-size: 12px;
		color: var(--text-faint);
		margin: 0;
		line-height: 1.5;
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding: 14px 18px;
		border-top: 1px solid var(--border-soft);
		flex: 0 0 auto;
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
