<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import LearningNote from '../LearningNote.svelte';
	import HopTimeline from '../HopTimeline.svelte';
	import { HOPS, getHop } from '$lib/brewing/ingredients';
	import { newHopAddition } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import { prefs } from '$lib/state/prefs.svelte';
	import type { HopUse } from '$lib/brewing/types';

	/**
	 * Hops go in at three different moments, and only the first two happen during
	 * this stage at all. Saying so is the difference between a schedule that makes
	 * sense and three unexplained lists.
	 */
	const USE_LABEL: Record<HopUse, string> = {
		boil: 'In the kettle',
		whirlpool: 'After the flame',
		dryHop: 'Later, in the fermenter'
	};

	const USE_WHEN: Record<HopUse, string> = {
		boil: 'While the wort is boiling. Heat and time turn hop resin into bitterness, so this is where almost all of it comes from — and where aroma is destroyed.',
		whirlpool:
			'The flame is out but the wort is still hot, so it steeps rather than boils. Flavour and aroma survive; bitterness barely builds.',
		dryHop:
			'Days after this stage, in the fermenter, with no heat at all. Pure aroma: dry hops add no measured IBU, though they do add a perceived bite.'
	};

	const USE_ADD: Record<HopUse, string> = {
		boil: 'Add a kettle hop',
		whirlpool: 'Add a whirlpool hop',
		dryHop: 'Add a dry hop'
	};

	const ibuByAddition = $derived(
		new Map(
			brew.result ? (brew.context?.ibu.contributions ?? []).map((c) => [c.additionId, c.ibu]) : []
		)
	);

	let picking = $state<HopUse | undefined>(undefined);
	/** An unusual boil length is a deliberate choice, so it survives a revisit. */
	let customBoil = $state(![30, 60, 90].includes(brew.recipe.boilTimeMin));
	let originFilter = $state<string>('all');

	const origins = $derived(['all', ...new Set(HOPS.map((h) => h.origin))]);
	const pickerHops = $derived(
		originFilter === 'all' ? HOPS : HOPS.filter((h) => h.origin === originFilter)
	);

	function add(hopId: string) {
		if (!picking) return;
		brew.recipe.hops.push(newHopAddition(picking, hopId));
		picking = undefined;
	}

	function remove(id: string) {
		brew.recipe.hops = brew.recipe.hops.filter((h) => h.id !== id);
	}

	const grouped = $derived(
		(['boil', 'whirlpool', 'dryHop'] as HopUse[]).map((use) => ({
			use,
			additions: brew.recipe.hops.filter((h) => h.use === use)
		}))
	);

	const descriptors = $derived(brew.context?.hopLoad.descriptors ?? []);
</script>

<div class="flex flex-col gap-6">
	<div>
		<span class="field-label mb-1.5">
			How long to boil
			{#if brew.recipe.boilTimeMin === DEFAULTS.boilTimeMin && !customBoil}
				<span class="ms-1.5 text-[0.625rem] tracking-wide text-subtle">default</span>
			{/if}
		</span>
		<div class="flex flex-wrap items-center gap-1.5">
			{#each [30, 60, 90] as preset (preset)}
				<button
					type="button"
					class="btn h-9 text-xs {brew.recipe.boilTimeMin === preset && !customBoil
						? 'btn-primary'
						: 'btn-ghost'}"
					aria-pressed={brew.recipe.boilTimeMin === preset && !customBoil}
					onclick={() => {
						brew.recipe.boilTimeMin = preset;
						customBoil = false;
					}}
				>
					{preset} min
				</button>
			{/each}
			<button
				type="button"
				class="btn h-9 text-xs {customBoil ? 'btn-primary' : 'btn-ghost'}"
				aria-pressed={customBoil}
				onclick={() => (customBoil = true)}
			>
				Other
			</button>
		</div>

		{#if customBoil}
			<div class="mt-2 max-w-sm">
				<SliderField
					label="Boil time"
					bind:value={brew.recipe.boilTimeMin}
					defaultValue={DEFAULTS.boilTimeMin}
					min={0}
					max={180}
					step={5}
					unit=" min"
				/>
			</div>
		{/if}

		<LearningNote
			why="Sixty minutes is the default because that is roughly how long it takes to isomerise most of the alpha acid you are going to get. Pilsner malt wants ninety, to drive off the precursor that becomes cooked-corn DMS."
		/>
	</div>

	<section>
		<h3 class="field-label mb-2">The hop schedule, from kettle to fermenter</h3>
		<HopTimeline hops={brew.recipe.hops} boilTimeMin={brew.recipe.boilTimeMin} {ibuByAddition} />
	</section>

	<div>
		<p class="tnum text-sm text-muted">
			<span class="font-medium text-fg">{Math.round(brew.result.metrics.ibu)} IBU</span>
			· BU:GU {brew.result.metrics.buGu.toFixed(2)}
			{#if descriptors.length}
				· aroma reads as {descriptors.join(', ')}
			{/if}
		</p>
		{#if prefs.showWhy}
			<p class="prose-measure mt-1 text-xs text-subtle">
				IBU counts the bitter compounds the boil created. BU:GU weighs that against how much sugar
				is in the wort, which is the better guide: the same bitterness feels sharp in a small beer
				and mild in a big one. Most balanced beers land between 0.4 and 0.8.
			</p>
		{/if}
	</div>

	{#each grouped as group (group.use)}
		<section>
			<div class="flex items-center justify-between gap-3">
				<div class="min-w-[12rem] flex-1">
					<h3 class="field-label">{USE_LABEL[group.use]}</h3>
					<p class="prose-measure mt-1 text-xs text-muted">{USE_WHEN[group.use]}</p>
				</div>
				<button
					type="button"
					class="btn btn-ghost h-8 text-xs"
					onclick={() => (picking = picking === group.use ? undefined : group.use)}
					aria-expanded={picking === group.use}
				>
					{USE_ADD[group.use]}
				</button>
			</div>

			{#if group.additions.length === 0}
				<p class="mt-2 text-xs text-subtle">
					{#if group.use === 'boil'}
						Nothing in the kettle yet. Without a bittering charge the beer will taste like sweet
						wort.
					{:else if group.use === 'whirlpool'}
						None. Optional.
					{:else}
						None. Optional.
					{/if}
				</p>
			{:else}
				<ul class="mt-2 flex flex-col gap-2">
					{#each group.additions as addition (addition.id)}
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
											<span class="chip tnum"
												>{Math.round(ibuByAddition.get(addition.id) ?? 0)} IBU</span
											>
										{/if}
										<button
											type="button"
											class="btn btn-quiet h-9 w-9 !px-0"
											onclick={() => remove(addition.id)}
											aria-label="Remove {hop.name}, {USE_LABEL[group.use].toLowerCase()}"
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
										id="g-{addition.id}"
									/>
									{#if addition.use === 'boil'}
										<SliderField
											label="Minutes left in the boil"
											bind:value={addition.time}
											min={0}
											max={brew.recipe.boilTimeMin}
											step={1}
											unit=" min"
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
											id="d-{addition.id}"
										/>
									{/if}
								</div>
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		</section>
	{/each}

	{#if picking}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
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
								<span class="tnum text-xs text-muted">{hop.alphaAcid.toFixed(1)}% AA</span>
							</span>
							<span class="block text-xs text-subtle">{hop.blurb}</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
