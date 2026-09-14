<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { EXAMPLES } from '$lib/brewing/recipes';
	import { simulate } from '$lib/brewing/simulate';
	import { srmToCss } from '$lib/brewing/appearance';
	import {
		deleteRecipe,
		duplicateRecipe,
		importJson,
		listRecipes,
		renameRecipe
	} from '$lib/persist/recipes';
	import { deleteAllLocalData } from '$lib/persist/db.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import type { StoredRecipe } from '$lib/brewing/types';

	let saved = $state<StoredRecipe[]>([]);
	let status = $state('');
	let confirmWipe = $state(false);
	let wipeConfirmation = $state('');
	let fileInput = $state<HTMLInputElement>();

	async function refresh() {
		saved = await listRecipes();
	}

	$effect(() => {
		void refresh();
	});

	const previews = $derived(
		EXAMPLES.map((example) => {
			const recipe = example.build();
			const result = simulate(recipe);
			return { example, recipe, result };
		})
	);

	function open(recipe: Parameters<typeof brew.load>[0], stored?: StoredRecipe) {
		brew.load(recipe, stored);
		brew.leaveChallenge();
		brew.setStage('water');
		void goto(resolve('/'));
	}

	async function remove(stored: StoredRecipe) {
		await deleteRecipe(stored.id);
		status = `Deleted "${stored.name}".`;
		await refresh();
	}

	async function rename(stored: StoredRecipe, name: string) {
		if (!name.trim() || name === stored.name) return;
		await renameRecipe(stored, name.trim());
		await refresh();
	}

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const result = importJson(await file.text());
		status = result.ok ? `Imported "${result.stored.name}".` : result.error;
		if (result.ok) open(result.stored.recipe, result.stored);
		if (fileInput) fileInput.value = '';
	}

	async function wipe() {
		await deleteAllLocalData();
		confirmWipe = false;
		wipeConfirmation = '';
		status = 'All local BrewLab data deleted.';
		await refresh();
	}
</script>

<svelte:head><title>Recipes — BrewLab</title></svelte:head>

<main id="main" class="mx-auto w-full max-w-[80rem] flex-1 px-3 py-6 sm:px-5">
	<h1 class="font-display text-xl">Recipes</h1>
	<p class="prose-measure mt-2 text-sm text-muted">
		Saved brews live in this browser only. Export a recipe to keep it somewhere else, or send
		someone a link — the whole recipe travels inside the URL.
	</p>

	<p class="mt-3 min-h-4 text-xs text-muted" role="status" aria-live="polite">{status}</p>

	<section class="mt-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="font-display text-base font-semibold">Your saved brews</h2>
			<button type="button" class="btn btn-ghost" onclick={() => fileInput?.click()}
				>Import a file</button
			>
			<input
				bind:this={fileInput}
				type="file"
				accept="application/json,.json"
				class="sr-only"
				onchange={onFile}
				aria-label="Import a BrewLab recipe file"
			/>
		</div>

		{#if saved.length === 0}
			<p class="mt-3 rounded-lg border border-dashed border-line-strong p-6 text-sm text-muted">
				Nothing saved yet. Build a brew and press Save, or start from one of the examples below.
			</p>
		{:else}
			<ul class="mt-3 flex flex-col gap-2">
				{#each saved as stored (stored.id)}
					{@const result = simulate(stored.recipe)}
					<li class="panel flex flex-wrap items-center gap-4 p-3">
						<span
							class="h-9 w-9 shrink-0 rounded-full ring-1 ring-line-strong"
							style="background:{srmToCss(result.metrics.srm)}"
							aria-hidden="true"
						></span>
						<div class="min-w-[12rem] flex-1">
							<label class="sr-only" for="name-{stored.id}">Recipe name</label>
							<input
								id="name-{stored.id}"
								class="input"
								value={stored.name}
								onblur={(event) => rename(stored, event.currentTarget.value)}
							/>
							<p class="tnum mt-1 text-xs text-subtle">
								{result.metrics.abv.toFixed(1)}% · {Math.round(result.metrics.ibu)} IBU ·
								{Math.round(result.metrics.ebc)} EBC · scored {result.scores.overall} · updated {new Date(
									stored.updatedAt
								).toLocaleDateString()}
							</p>
						</div>
						<div class="flex gap-2">
							<button
								type="button"
								class="btn btn-primary"
								onclick={() => open(stored.recipe, stored)}>Open</button
							>
							<button
								type="button"
								class="btn btn-ghost"
								onclick={async () => {
									await duplicateRecipe(stored);
									await refresh();
								}}
							>
								Duplicate
							</button>
							<button type="button" class="btn btn-quiet" onclick={() => remove(stored)}
								>Delete</button
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="mt-10">
		<h2 class="font-display text-base font-semibold">Start from an example</h2>
		<p class="prose-measure mt-1 text-sm text-muted">
			Each of these is a complete, working recipe — the figures are alcohol, bitterness (IBU) and
			colour (EBC). Open one and change a single thing to see what it does.
		</p>
		<ul class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each previews as preview (preview.example.id)}
				<li>
					<button
						type="button"
						class="panel flex h-full w-full items-start gap-3 p-3 text-start transition-colors hover:bg-ui"
						onclick={() => open(preview.recipe)}
					>
						<span
							class="mt-0.5 h-8 w-8 shrink-0 rounded-full ring-1 ring-line-strong"
							style="background:{srmToCss(preview.result.metrics.srm)}"
							aria-hidden="true"
						></span>
						<span class="min-w-0">
							<span class="block text-sm font-medium">{preview.example.name}</span>
							<span class="block text-xs text-subtle">{preview.example.tagline}</span>
							<span class="tnum mt-1 block text-xs text-muted">
								{preview.result.metrics.abv.toFixed(1)}% · {Math.round(preview.result.metrics.ibu)} IBU
								·
								{Math.round(preview.result.metrics.ebc)} EBC
							</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>

	<section class="mt-10 rounded-lg border border-danger-dim p-4">
		<h2 class="font-display text-base font-semibold">Delete all local data</h2>
		<p class="prose-measure mt-1 text-sm text-muted">
			Removes every saved recipe, the autosaved brew and your challenge progress from this browser.
			This cannot be undone.
		</p>
		{#if !confirmWipe}
			<button type="button" class="btn btn-ghost mt-3" onclick={() => (confirmWipe = true)}>
				Delete all local data
			</button>
		{:else}
			<div class="mt-3 flex flex-wrap items-end gap-3">
				<div>
					<label class="field-label mb-1" for="wipe-confirm">Type DELETE to confirm</label>
					<input
						id="wipe-confirm"
						class="input w-40"
						bind:value={wipeConfirmation}
						autocomplete="off"
					/>
				</div>
				<button
					type="button"
					class="btn bg-danger font-bold text-ink hover:brightness-110"
					disabled={wipeConfirmation !== 'DELETE'}
					onclick={wipe}
				>
					Delete everything
				</button>
				<button
					type="button"
					class="btn btn-quiet"
					onclick={() => {
						confirmWipe = false;
						wipeConfirmation = '';
					}}
				>
					Keep my data
				</button>
			</div>
		{/if}
	</section>
</main>
