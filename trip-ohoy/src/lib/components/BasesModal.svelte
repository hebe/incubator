<script lang="ts">
	// Modal for adding/removing bases on an existing trip.
	// One base minimum is enforced (remove disabled when only one remains).
	import type { PlannerStore } from '$lib/stores/planner.svelte';
	import { BASE_PALETTE, BASE_PALETTE_KEYS } from '$lib/data/catalog';
	import { t } from '$lib/i18n/strings';

	let { store }: { store: PlannerStore } = $props();

	let newName = $state('');
	let newColor = $state(BASE_PALETTE_KEYS[0]);

	async function add() {
		if (!newName.trim()) return;
		await store.addNewBase(newName.trim(), newColor);
		newName = '';
		newColor = BASE_PALETTE_KEYS[0];
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); add(); }
	}
</script>

<div class="scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && store.closeBasesManager()}>
	<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
		<div class="head">
			<div class="title">{t.manageBasesTitle}</div>
			<button class="close" onclick={store.closeBasesManager}>×</button>
		</div>

		<div class="body">
			<!-- Existing bases -->
			{#each store.bases as base (base.id)}
				{@const pal = BASE_PALETTE[base.colorToken]}
				<div class="base-row">
					<span
						class="color-dot"
						style="background:{pal?.color ?? 'var(--text-2)'};"
					></span>
					<span class="base-name">{base.name}</span>
					<button
						class="rm"
						disabled={store.bases.length <= 1}
						onclick={() => store.deleteBase(base.id)}
					>{t.removeBase}</button>
				</div>
			{/each}

			<!-- Add new base -->
			<div class="add-row">
				<input
					class="in"
					bind:value={newName}
					placeholder={t.basePlaceholder}
					onkeydown={onKey}
				/>
				<div class="swatches">
					{#each BASE_PALETTE_KEYS as key}
						{@const pal = BASE_PALETTE[key]}
						<button
							class="swatch"
							class:selected={newColor === key}
							style="background:{pal.color};"
							title={key}
							onclick={() => (newColor = key)}
						></button>
					{/each}
				</div>
				<button class="add-btn" disabled={!newName.trim()} onclick={add}>{t.addBase}</button>
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
		max-width: 400px;
		border-radius: var(--r-modal);
		box-shadow: 0 22px 64px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 18px 14px;
		border-bottom: 1px solid var(--border-soft);
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
	.body {
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.base-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	.color-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.base-name {
		flex: 1;
		font-size: 14px;
		font-weight: 600;
		color: oklch(0.3 0.012 70);
	}
	.rm {
		font-size: 12px;
		font-weight: 600;
		color: oklch(0.5 0.08 25);
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px 4px;
	}
	.rm:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.add-row {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
		padding-top: 4px;
	}
	.in {
		flex: 1;
		min-width: 120px;
		font-family: inherit;
		font-size: 13px;
		color: var(--text);
		background: oklch(0.99 0.004 90);
		border: 1px solid oklch(0.89 0.01 85);
		border-radius: 9px;
		padding: 8px 10px;
		outline: none;
	}
	.in:focus {
		border-color: var(--action);
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
	}
	.swatch.selected {
		border-color: oklch(0.25 0.012 70);
		transform: scale(1.2);
	}
	.add-btn {
		font-size: 12.5px;
		font-weight: 600;
		color: #fff;
		background: var(--action);
		border: none;
		border-radius: 9px;
		padding: 8px 14px;
		cursor: pointer;
	}
	.add-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
</style>
