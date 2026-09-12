<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { brew } from '$lib/state/brew.svelte';
	import { exportJson, saveRecipe, wrap } from '$lib/persist/recipes';
	import { shareUrl } from '$lib/persist/share';

	let status = $state('');

	function announce(message: string) {
		status = message;
	}

	async function save() {
		const stored = await saveRecipe($state.snapshot(brew.recipe), brew.stored);
		brew.stored = stored;
		announce(`Saved as "${stored.name}".`);
	}

	async function duplicate() {
		const copy = { ...$state.snapshot(brew.recipe), name: `${brew.recipe.name} (copy)` };
		const stored = await saveRecipe(copy);
		brew.load(stored.recipe, stored);
		announce(`Duplicated as "${stored.name}".`);
	}

	function download() {
		const stored = brew.stored ?? wrap($state.snapshot(brew.recipe));
		const blob = new Blob([exportJson(stored)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${stored.name.replace(/[^\w\- ]+/g, '').trim() || 'recipe'}.brewlab.json`;
		link.click();
		URL.revokeObjectURL(url);
		announce('Recipe file downloaded.');
	}

	async function share() {
		const url = await shareUrl($state.snapshot(brew.recipe), window.location.origin, '/');
		try {
			await navigator.clipboard.writeText(url);
			announce('Link copied. The whole recipe travels in the URL, so nothing is sent to a server.');
		} catch {
			announce(`Copy this link: ${url}`);
		}
	}
</script>

<section class="no-print panel p-4">
	<div class="flex flex-wrap items-end gap-4">
		<div class="min-w-[14rem] flex-1">
			<label class="field-label mb-1" for="recipe-name">Name this beer</label>
			<input id="recipe-name" class="input" bind:value={brew.recipe.name} />
		</div>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn btn-primary" onclick={save}>Save</button>
			<button type="button" class="btn btn-ghost" onclick={duplicate}>Duplicate</button>
			<button type="button" class="btn btn-ghost" onclick={download}>Export</button>
			<button type="button" class="btn btn-ghost" onclick={share}>Copy link</button>
			<button type="button" class="btn btn-ghost" onclick={() => goto(resolve('/print'))}
				>Print sheet</button
			>
		</div>
	</div>

	<p class="mt-3 min-h-4 text-xs text-muted" role="status" aria-live="polite">{status}</p>
	<p class="mt-1 text-xs text-subtle">
		Your work is saved as you go, in this browser only. Saving here adds it to your recipe library;
		exporting or copying a link is how it leaves the machine.
	</p>
</section>
