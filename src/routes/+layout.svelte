<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';
	import { loadAutosave, saveAutosave } from '$lib/persist/recipes';
	import { storageUnavailable } from '$lib/persist/db.svelte';
	import { decodeRecipe } from '$lib/persist/share';

	let { children } = $props();

	/**
	 * Startup order matters: a shared link wins over the autosave, because the
	 * user followed it on purpose.
	 */
	async function loadSharedFragment(): Promise<boolean> {
		const shared = await decodeRecipe(window.location.hash);
		if (!shared) return false;
		brew.load(shared);
		history.replaceState(null, '', window.location.pathname);
		return true;
	}

	$effect(() => {
		prefs.hydrate();
		void (async () => {
			if (!(await loadSharedFragment())) {
				const saved = await loadAutosave();
				if (saved) brew.resume(saved.recipe, saved.brewedTo, saved.stage);
			}
			await brew.hydrateProgress();
			brew.hydrated = true;
		})();

		// Someone pasting a shared link into an already-open tab only changes the
		// fragment, which does not reload the page.
		const onHashChange = () => void loadSharedFragment();
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	});

	// Autosave the working brew, debounced so dragging a slider does not thrash
	// IndexedDB.
	$effect(() => {
		if (!brew.hydrated || !brew.started) return;
		const snapshot = $state.snapshot(brew.recipe);
		const brewedTo = brew.brewedTo;
		const stage = brew.stage;
		const timer = setTimeout(() => void saveAutosave(snapshot, brewedTo, stage), 600);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="BrewLab is a browser beer-brewing simulator: build a recipe from water to glass and see exactly why it tastes the way it does."
	/>
</svelte:head>

<a
	href="#main"
	class="sr-only rounded-md bg-copper px-4 py-2 font-medium text-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
>
	Skip to content
</a>

<div class="flex min-h-dvh flex-col">
	<AppHeader />

	{#if storageUnavailable()}
		<p
			class="no-print border-b border-warn/40 bg-warn/10 px-4 py-2 text-center text-xs text-warn"
			role="status"
		>
			This browser is not letting BrewLab store anything, so nothing will be saved between visits.
			Everything else works — export a recipe if you want to keep it.
		</p>
	{/if}
	{@render children()}
</div>
