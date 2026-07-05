<script lang="ts">
	import { onMount } from 'svelte';
	import '$lib/styles/tokens.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	let unlocked = $state(false);
	let password = $state('');
	let shaking = $state(false);
	let checking = $state(false);

	const STORAGE_KEY = 'trip-ohoy-unlocked';

	onMount(() => {
		if (localStorage.getItem(STORAGE_KEY) === '1') unlocked = true;
	});

	async function attempt() {
		if (!password.trim() || checking) return;
		checking = true;
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: password.trim() })
			});
			if (res.ok) {
				localStorage.setItem(STORAGE_KEY, '1');
				unlocked = true;
			} else {
				password = '';
				shaking = true;
				setTimeout(() => (shaking = false), 500);
			}
		} catch {
			shaking = true;
			setTimeout(() => (shaking = false), 500);
		} finally {
			checking = false;
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') attempt();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if unlocked}
	{@render children()}
{:else}
	<div class="gate">
		<div class="box" class:shake={shaking}>
			<div class="logo">⛵</div>
			<div class="wordmark">TRIP OHOY</div>
			<p class="prompt">Type the magic password to set sail</p>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="pw-input"
				type="password"
				placeholder="Password"
				bind:value={password}
				{onkeydown}
				autofocus
			/>
			<button class="sail-btn" disabled={!password.trim() || checking} onclick={attempt}>
				{checking ? '…' : 'Set sail →'}
			</button>
		</div>
	</div>
{/if}

<style>
	.gate {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--page-bg);
		padding: 24px;
	}
	.box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 48px 40px;
		width: 100%;
		max-width: 360px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
	}
	.logo {
		font-size: 48px;
		line-height: 1;
	}
	.wordmark {
		font-size: 22px;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--brand);
	}
	.prompt {
		font-size: 14px;
		color: var(--text-2);
		text-align: center;
		margin: 0;
		margin-bottom: 4px;
	}
	.pw-input {
		width: 100%;
		font-family: inherit;
		font-size: 15px;
		color: var(--text);
		background: oklch(0.99 0.004 90);
		border: 1px solid oklch(0.89 0.01 85);
		border-radius: 10px;
		padding: 11px 14px;
		outline: none;
		box-sizing: border-box;
		text-align: center;
		letter-spacing: 0.08em;
	}
	.pw-input:focus {
		border-color: var(--action);
	}
	.sail-btn {
		width: 100%;
		font-family: inherit;
		font-size: 14.5px;
		font-weight: 700;
		color: #fff;
		background: var(--action);
		border: none;
		border-radius: 10px;
		padding: 12px;
		cursor: pointer;
		transition: opacity 0.12s;
	}
	.sail-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.shake {
		animation: shake 0.45s ease;
	}
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20%       { transform: translateX(-8px); }
		40%       { transform: translateX(8px); }
		60%       { transform: translateX(-6px); }
		80%       { transform: translateX(6px); }
	}
</style>
