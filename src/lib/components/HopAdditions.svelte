<script lang="ts">
	/**
	 * One group of hop additions, with its own picker.
	 *
	 * The three groups used to live together on the boil stage, which put the dry
	 * hops two stages ahead of the moment they actually happen — the group's own
	 * note had to explain that it belonged in the fermenter, and its controls ask
	 * for a day of fermentation. Extracting the editor lets each group sit on the
	 * stage where a brewer would really be standing: kettle and whirlpool on the
	 * boil, dry hops on the fermentation stage.
	 */
	import SliderField from './SliderField.svelte';
	import { HOPS, getHop } from '$lib/brewing/ingredients';
	import { newHopAddition } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';
	import type { HopUse } from '$lib/brewing/types';

	let { use }: { use: HopUse } = $props();

	const USE_LABEL: Record<HopUse, string> = {
		boil: 'In the kettle',
		whirlpool: 'After the flame',
		dryHop: 'Dry hops'
	};

	/**
	 * Said once, above the list. As a `why` on each addition's slider it appeared
	 * in full under every hop — four identical lines per row, and a reader with
	 * two hops read the same paragraph twice.
	 */
	const AMOUNT_WHY: Record<HopUse, string> = {
		boil: 'Doubling the grams roughly doubles the bitterness, and a charge going in late needs far more for the same effect.',
		whirlpool:
			'Into the same wort as everything else, but off the heat, so these buy aroma rather than bitterness. Weights run heavier than a bittering charge for the same effect.',
		dryHop:
			'Pure aroma, and it saturates: past roughly 8 g per litre more hops stop buying more smell and start tasting of grass.'
	};

	const USE_ADD: Record<HopUse, string> = {
		boil: 'Add a kettle hop',
		whirlpool: 'Add a whirlpool hop',
		dryHop: 'Add a dry hop'
	};

	const additions = $derived(brew.recipe.hops.filter((h) => h.use === use));

	const ibuByAddition = $derived(
		new Map(
			brew.result ? (brew.context?.ibu.contributions ?? []).map((c) => [c.additionId, c.ibu]) : []
		)
	);

	let picking = $state(false);
	let originFilter = $state<string>('all');

	const origins = $derived(['all', ...new Set(HOPS.map((h) => h.origin))]);
	const pickerHops = $derived(
		originFilter === 'all' ? HOPS : HOPS.filter((h) => h.origin === originFilter)
	);

	function add(hopId: string) {
		brew.recipe.hops.push(newHopAddition(use, hopId, additions.length));
		picking = false;
	}

	function remove(id: string) {
		brew.recipe.hops = brew.recipe.hops.filter((h) => h.id !== id);
	}
</script>

<!--
	No heading and no "what this group is for" note: the question on the screen
	above is exactly that, and having both put the same two sentences a hundred
	pixels apart.
-->
<div class="flex items-center justify-between gap-3">
	<div class="min-w-[12rem] flex-1">
		{#if additions.length > 0}
			<p class="prose-measure text-xs text-muted">{AMOUNT_WHY[use]}</p>
		{/if}
	</div>
	<button
		type="button"
		class="btn btn-ghost h-8 text-xs"
		onclick={() => (picking = !picking)}
		aria-expanded={picking}
	>
		{USE_ADD[use]}
	</button>
</div>

{#if additions.length === 0}
	<p class="mt-2 text-xs text-subtle">
		{#if use === 'boil'}
			Nothing in the kettle yet. Without a bittering charge the beer will taste like sweet wort.
		{:else if use === 'whirlpool'}
			None. Optional.
		{:else}
			None. Optional.
		{/if}
	</p>
{:else}
	<ul class="mt-2 flex flex-col gap-2">
		{#each additions as addition (addition.id)}
			{@const hop = getHop(addition.hopId)}
			{#if hop}
				<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0">
							<p class="text-sm font-medium">{hop.name}</p>
							<p class="text-xs text-subtle">
								{hop.origin} · {hop.alphaAcid.toFixed(1)}% alpha · {hop.tags.join(', ')}
							</p>
						</div>
						<div class="flex items-center gap-2">
							{#if (ibuByAddition.get(addition.id) ?? 0) >= 0.5}
								<span class="chip tnum">{Math.round(ibuByAddition.get(addition.id) ?? 0)} IBU</span>
							{/if}
							<button
								type="button"
								class="btn btn-quiet h-9 w-9 !px-0"
								onclick={() => remove(addition.id)}
								aria-label="Remove {hop.name}, {USE_LABEL[use].toLowerCase()}"
							>
								<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
									<path
										d="M4 4 L12 12 M12 4 L4 12"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										stroke-linecap="round"
									/>
								</svg>
							</button>
						</div>
					</div>
					<div class="mt-1 grid gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
						<SliderField
							label="Amount"
							bind:value={addition.grams}
							min={0}
							max={300}
							step={5}
							unit=" g"
							marks={[
								{ at: 20, label: 'lager' },
								{ at: 60, label: 'pale ale' },
								{ at: 150, label: 'IPA' }
							]}
							id="g-{addition.id}"
						/>
						{#if addition.use === 'boil'}
							<!--
								The marks are the whole lesson of this control: the same hop is a
								different ingredient at sixty minutes and at five, and each
								addition sits wherever you put it.
							-->
							<SliderField
								label="Minutes left in the boil"
								bind:value={addition.time}
								min={0}
								max={brew.recipe.boilTimeMin}
								step={1}
								unit=" min"
								marks={[
									{ at: 0, label: 'aroma' },
									{ at: 20, label: 'flavour' },
									{ at: Math.min(60, brew.recipe.boilTimeMin), label: 'bitterness' }
								]}
								id="t-{addition.id}"
							/>
						{:else if addition.use === 'whirlpool'}
							<SliderField
								label="Stand time"
								bind:value={addition.time}
								min={0}
								max={60}
								step={5}
								unit=" min"
								id="t-{addition.id}"
							/>
							<SliderField
								label="Stand temperature"
								bind:value={() => addition.tempC ?? 80, (v) => (addition.tempC = v)}
								min={60}
								max={100}
								step={1}
								unit=" °C"
								marks={[
									{ at: 70, label: 'aroma only' },
									{ at: 90, label: 'some bitterness' }
								]}
								why="How far you let the kettle cool before these go in. Hotter keeps extracting bitterness and drives more aroma off; cooler is almost pure aroma. Most brewers wait for 75–85 °C."
								id="wt-{addition.id}"
							/>
						{:else}
							<SliderField
								label="Contact"
								bind:value={addition.time}
								min={1}
								max={21}
								step={1}
								unit=" days"
								id="t-{addition.id}"
							/>
							<SliderField
								label="Added on day"
								bind:value={() => addition.day ?? 5, (v) => (addition.day = v)}
								min={0}
								max={21}
								step={1}
								unit=" of fermentation"
								marks={[{ at: 5, label: 'usual' }]}
								why="Which day of fermentation these go in. Most brewers wait until the vigorous bubbling has died down, around day three to five, because the escaping gas carries the aroma straight back out again."
								id="d-{addition.id}"
							/>
						{/if}
					</div>
				</li>
			{/if}
		{/each}
	</ul>
{/if}

{#if picking}
	<div class="mt-3 rounded-lg bg-surface p-3 ring-1 ring-line">
		<div class="mb-3 flex flex-wrap gap-1">
			{#each origins as origin (origin)}
				<button
					type="button"
					class="btn h-8 text-xs {originFilter === origin ? 'btn-primary' : 'btn-quiet'}"
					onclick={() => (originFilter = origin)}
					aria-pressed={originFilter === origin}
				>
					{origin === 'all' ? 'All origins' : origin}
				</button>
			{/each}
		</div>
		<!-- Said once, above the list, rather than left as a percentage with no meaning. -->
		<p class="prose-measure mb-2 text-xs text-subtle">
			Alpha is how much bitterness a gram can give. Around 4% is a gentle aroma hop; 12–16% is a
			bittering hop, where a small handful does the whole job.
		</p>
		<ul class="grid gap-1.5 sm:grid-cols-2">
			{#each pickerHops as hop (hop.id)}
				<li>
					<button
						type="button"
						class="w-full rounded-md p-2 text-start transition-colors hover:bg-ui-hover"
						onclick={() => add(hop.id)}
					>
						<span class="flex items-baseline justify-between gap-2">
							<span class="text-sm font-medium">{hop.name}</span>
							<span class="tnum text-xs text-muted">{hop.alphaAcid.toFixed(1)}% alpha</span>
						</span>
						<span class="block text-xs text-subtle">{hop.blurb}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
