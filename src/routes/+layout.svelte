<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';
	import { loadAutosave, saveAutosave } from '$lib/persist/recipes';
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
				if (saved) brew.load(saved.recipe, undefined, saved.brewedTo);
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
		const timer = setTimeout(() => void saveAutosave(snapshot, brewedTo), 600);
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
	{@render children()}
</div>
