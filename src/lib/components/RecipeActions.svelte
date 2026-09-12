<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { brew } from '$lib/state/brew.svelte';
	import { exportJson, importJson, saveRecipe, wrap } from '$lib/persist/recipes';
	import { shareUrl } from '$lib/persist/share';

	let status = $state('');
	let fileInput = $state<HTMLInputElement>();

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

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const result = importJson(await file.text());
		if (result.ok) {
			brew.load(result.stored.recipe, result.stored);
			announce(`Imported "${result.stored.name}".`);
		} else {
			announce(result.error);
		}
		if (fileInput) fileInput.value = '';
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

	function newBrewDay() {
		brew.startFresh();
		announce('Fresh brew day. Empty kettle, water on.');
	}
</script>

<section class="no-print panel p-4">
	<div class="flex flex-wrap items-end gap-4">
		<div class="min-w-[14rem] flex-1">
			<label class="field-label mb-1" for="recipe-name">Recipe name</label>
			<input id="recipe-name" class="input" bind:value={brew.recipe.name} />
		</div>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn btn-primary" onclick={save}>Save</button>
			<button type="button" class="btn btn-ghost" onclick={duplicate}>Duplicate</button>
			<button type="button" class="btn btn-ghost" onclick={download}>Export</button>
			<button type="button" class="btn btn-ghost" onclick={() => fileInput?.click()}>Import</button>
			<button type="button" class="btn btn-ghost" onclick={share}>Copy link</button>
			<button type="button" class="btn btn-ghost" onclick={() => goto(resolve('/print'))}
				>Print sheet</button
			>
			<button type="button" class="btn btn-quiet" onclick={newBrewDay}>New brew day</button>
		</div>
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept="application/json,.json"
		class="sr-only"
		onchange={onFile}
		aria-label="Import a BrewLab recipe file"
	/>

	<p class="mt-3 min-h-4 text-xs text-muted" role="status" aria-live="polite">{status}</p>
	<p class="mt-1 text-xs text-subtle">
		Everything is stored in this browser. No account, no server, nothing leaves the machine.
	</p>
</section>
