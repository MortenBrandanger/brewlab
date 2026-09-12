<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';
	import { STYLES } from '$lib/brewing/styles';

	const links = [
		{ path: '/', label: 'Brew' },
		{ path: '/challenges', label: 'Challenges' },
		{ path: '/recipes', label: 'Recipes' }
	] as const;

	// The style target only means something once a brew is under way.
	const onBrewPage = $derived(page.url.pathname === '/' && brew.started);
</script>

<header class="no-print border-b border-line bg-surface-2">
	<div class="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-5 gap-y-3 px-3 py-3 sm:px-5">
		<a href={resolve('/')} class="flex items-center gap-2.5 rounded-md">
			<svg viewBox="0 0 32 32" class="h-7 w-7" aria-hidden="true">
				<path d="M8 7 h16 l-2 20 q-.3 3 -3 3 h-6 q-2.7 0 -3 -3 Z" fill="var(--color-copper)" />
				<path d="M8.5 7 h15 l-.5 5 h-14 Z" fill="#f6efe0" />
				<path
					d="M24 11 h3.5 a3.5 3.5 0 0 1 0 7 H23"
					fill="none"
					stroke="var(--color-copper)"
					stroke-width="2.4"
				/>
			</svg>
			<span class="font-display text-base font-semibold tracking-tight">BrewLab</span>
		</a>

		<nav aria-label="Sections">
			<ul class="flex gap-1">
				{#each links as link (link.path)}
					{@const active = page.url.pathname === link.path}
					<li>
						<a
							href={resolve(link.path)}
							aria-current={active ? 'page' : undefined}
							class="flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition-colors
								{active ? 'bg-ui-active text-fg' : 'text-muted hover:bg-ui-hover hover:text-fg'}"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		{#if onBrewPage}
			<div class="flex items-center gap-2">
				<label class="field-label" for="mode-style">Target style</label>
				<select
					id="mode-style"
					class="input w-44"
					value={brew.recipe.targetStyleId ?? ''}
					onchange={(event) => {
						const value = event.currentTarget.value;
						brew.recipe.targetStyleId = value || undefined;
						brew.mode = value ? 'style' : brew.challengeId ? 'challenge' : 'free';
					}}
				>
					<option value="">Free brew — no target</option>
					{#each STYLES as style (style.id)}
						<option value={style.id}>{style.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="ms-auto flex items-center gap-1">
			{#if brew.started}
				<button type="button" class="btn btn-quiet h-9 text-xs" onclick={() => brew.startFresh()}>
					New brew
				</button>
			{/if}
			<button
				type="button"
				class="btn btn-quiet h-9 text-xs"
				aria-pressed={prefs.showWhy}
				onclick={() => {
					prefs.showWhy = !prefs.showWhy;
					prefs.persist();
				}}
			>
				{prefs.showWhy ? 'Hide' : 'Show'} explanations
			</button>
			<button
				type="button"
				class="btn btn-quiet h-9 text-xs"
				aria-pressed={prefs.motion}
				onclick={() => {
					prefs.motion = !prefs.motion;
					prefs.persist();
				}}
			>
				{prefs.motion ? 'Pause' : 'Play'} motion
			</button>
		</div>
	</div>
</header>
