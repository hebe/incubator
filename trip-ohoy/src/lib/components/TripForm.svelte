<script lang="ts">
	// Modal for creating a new trip: destination, dates, and bases.
	// Dispatches onclose() and oncreate(tripId) to the parent.
	import { BASE_PALETTE, BASE_PALETTE_KEYS } from '$lib/data/catalog';
	import { datesInRange } from '$lib/data/derive';
	import { t } from '$lib/i18n/strings';

	let {
		onclose,
		oncreate
	}: {
		onclose: () => void;
		oncreate: (tripId: string) => void | Promise<void>;
	} = $props();

	let destination = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let bases = $state<Array<{ _id: string; name: string; colorToken: string }>>([
		{ _id: crypto.randomUUID(), name: '', colorToken: BASE_PALETTE_KEYS[0] }
	]);
	let saving = $state(false);

	const dayCount = $derived(
		startDate && endDate && startDate <= endDate
			? datesInRange(startDate, endDate).length
			: 0
	);
	const canCreate = $derived(
		destination.trim().length > 0 &&
		(!startDate || !endDate || startDate <= endDate) &&
		bases.some((b) => b.name.trim().length > 0)
	);

	function addBase() {
		const nextColor = BASE_PALETTE_KEYS[bases.length % BASE_PALETTE_KEYS.length];
		bases = [...bases, { _id: crypto.randomUUID(), name: '', colorToken: nextColor }];
	}

	function removeBase(id: string) {
		if (bases.length <= 1) return;
		bases = bases.filter((b) => b._id !== id);
	}

	async function create() {
		if (!canCreate || saving) return;
		saving = true;
		try {
			const validBases = bases
				.filter((b) => b.name.trim().length > 0)
				.map((b) => ({ name: b.name.trim(), colorToken: b.colorToken }));
			// Import lazily to avoid top-level coupling
			const { TripsStore } = await import('$lib/stores/trips.svelte');
			const store = new TripsStore();
			const tripId = await store.create(destination.trim(), startDate, endDate, validBases);
			await oncreate(tripId);
		} finally {
			saving = false;
		}
	}
</script>

<div class="scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose()}>
	<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
		<div class="head">
			<div class="title">{t.tripFormTitle}</div>
			<button class="close" onclick={onclose}>×</button>
		</div>

		<div class="scroll">
			<!-- Destination -->
			<div class="field">
				<label class="lbl" for="tf-dest">{t.destinationLabel}</label>
				<input id="tf-dest" class="in" bind:value={destination} placeholder={t.destinationPlaceholder} />
			</div>

			<!-- Dates -->
			<div class="row">
				<div class="field grow">
					<label class="lbl" for="tf-start">{t.departureDateLabel} <span class="opt">optional</span></label>
					<input id="tf-start" class="in" type="date" bind:value={startDate} />
				</div>
				<div class="field grow">
					<label class="lbl" for="tf-end">{t.returnDateLabel} <span class="opt">optional</span></label>
					<input id="tf-end" class="in" type="date" bind:value={endDate} min={startDate} />
				</div>
				{#if dayCount > 0}
					<div class="day-count">{t.days(dayCount)}</div>
				{/if}
			</div>

			<!-- Bases -->
			<div class="field">
				<div class="lbl">{t.basesLabel}</div>
				<div class="bases-list">
					{#each bases as base (base._id)}
						<div class="base-row">
							<input class="in grow" bind:value={base.name} placeholder={t.basePlaceholder} />
							<div class="swatches">
								{#each BASE_PALETTE_KEYS as key}
									{@const pal = BASE_PALETTE[key]}
									<button
										class="swatch"
										class:selected={base.colorToken === key}
										style="background:{pal.color};"
										title={key}
										onclick={() => (base.colorToken = key)}
									></button>
								{/each}
							</div>
							{#if bases.length > 1}
								<button class="rm-base" onclick={() => removeBase(base._id)}>×</button>
							{/if}
						</div>
					{/each}
				</div>
				<button class="add-base-btn" onclick={addBase}>{t.addBase}</button>
			</div>
		</div>

		<div class="foot">
			<button class="cancel-btn" onclick={onclose}>{t.cancel}</button>
			<button class="save-btn" disabled={!canCreate || saving} onclick={create}>
				{saving ? '…' : t.createTrip}
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
	.bases-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.base-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.swatches {
		display: flex;
		gap: 5px;
	}
	.swatch {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		transition: transform 0.1s;
	}
	.swatch.selected {
		border-color: oklch(0.25 0.012 70);
		transform: scale(1.2);
	}
	.rm-base {
		border: none;
		background: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		padding: 0 4px;
	}
	.add-base-btn {
		font-size: 13px;
		font-weight: 600;
		color: var(--action);
		background: var(--action-soft-bg);
		border: 1px solid var(--action-soft-border);
		border-radius: 9px;
		padding: 8px 14px;
		cursor: pointer;
		align-self: flex-start;
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
