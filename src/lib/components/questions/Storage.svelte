<script lang="ts">
	/**
	 * How long does it sit, and how cold?
	 *
	 * Time and temperature, and the curve the two of them put the beer on.
	 */
	import SliderField from '../SliderField.svelte';
	import AgeCurve from '../AgeCurve.svelte';
	import { brew } from '$lib/state/brew.svelte';

	const conditioning = $derived(brew.recipe.conditioning);

	/**
	 * Optional on older saved recipes, so it is read with a fallback. Bottles
	 * carbonate somewhere warm first, so for them this is where it goes after.
	 */
	const packaging = $derived(brew.recipe.conditioning.packaging ?? 'bottles');

	const hopAroma = $derived(brew.result.sensory.hopAroma);
	const hoppy = $derived(
		(brew.context?.hopLoad.dryHopGPerL ?? 0) + (brew.context?.hopLoad.whirlpoolGPerL ?? 0) > 2
	);

	/**
	 * The places a homebrewer actually keeps beer, each with the time it implies.
	 * Cold storage roughly doubles how long hop aroma survives and slows
	 * oxidation; warm storage speeds up maturation and every way a beer can go
	 * wrong. The cards say which trade each place makes.
	 */
	const PLACES = [
		{
			id: 'cellar',
			name: 'The cellar',
			tempC: 8,
			days: 14,
			when: '2 weeks',
			what: 'Cool and dark. A fortnight here settles the last of the yeast and knits the malt together, and hop aroma survives it. What most beers want.'
		},
		{
			id: 'fridge',
			name: 'The fridge, for a month',
			tempC: 3,
			days: 30,
			when: '1 month',
			what: 'Near freezing. Lagers were named for this — the yeast drops brilliantly clear and rough edges smooth out, slowly. Hoppy beers keep their smell longest here.'
		},
		{
			id: 'cupboard',
			name: 'A cupboard',
			tempC: 18,
			days: 14,
			when: '2 weeks',
			what: 'Room temperature. Everything happens faster, including the things you did not want: hop aroma fades and oxidation shows within weeks.'
		},
		{
			id: 'laid-down',
			name: 'Laid down',
			tempC: 10,
			days: 365,
			when: 'a year',
			what: 'A year in the cool for a strong, dark beer. Alcohol softens and the malt deepens; anything hoppy or pale has nothing to gain and everything to lose.'
		}
	];

	let byHand = $state(false);
	const custom = $derived(
		byHand || !PLACES.some((p) => p.days === conditioning.days && p.tempC === conditioning.tempC)
	);

	function choose(place: (typeof PLACES)[number]) {
		brew.recipe.conditioning.days = place.days;
		brew.recipe.conditioning.tempC = place.tempC;
		byHand = false;
	}
</script>

<div class="flex flex-col gap-5">
	<!--
		Two sliders asked "how long" and "how cold" as if they were separate
		numbers. They are one decision: where the crate lives. Each card is a
		place, with the time it implies, and the odd arrangement is a card too.
	-->
	<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
		{#each PLACES as place (place.id)}
			{@const selected =
				!custom && conditioning.days === place.days && conditioning.tempC === place.tempC}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={selected}
					onclick={() => choose(place)}
				>
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium">
							{place.name}
							{#if selected && place.id === 'cellar'}
								<span class="ms-1.5 text-[0.625rem] tracking-wide text-fg/70 uppercase"
									>default</span
								>
							{/if}
						</span>
						<span class="tnum text-xs {selected ? 'text-fg' : 'text-muted'}"
							>{place.tempC} °C · {place.when}</span
						>
					</span>
					<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
						>{place.what}</span
					>
				</button>
			</li>
		{/each}
		<li>
			<button
				type="button"
				class="h-full w-full rounded-lg p-3 text-start ring-1 {custom
					? 'bg-copper-dim ring-copper'
					: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
				aria-pressed={custom}
				onclick={() => (byHand = true)}
			>
				<span class="block text-sm font-medium">Somewhere else</span>
				<span class="mt-0.5 block text-xs {custom ? 'text-fg' : 'text-subtle'}">
					Any temperature, for any length of time.
				</span>
			</button>
		</li>
	</ul>

	{#if custom}
		<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
			<SliderField
				label="Conditioning time"
				bind:value={brew.recipe.conditioning.days}
				min={0}
				max={365}
				step={1}
				unit=" days"
				marks={[
					{ at: 14, label: '2 wk' },
					{ at: 90, label: '3 mo' },
					{ at: 180, label: '6 mo' }
				]}
			/>
			<SliderField
				label={packaging === 'bottles' ? 'Then stored at' : 'Stored at'}
				bind:value={brew.recipe.conditioning.tempC}
				min={-1}
				max={25}
				step={1}
				unit=" °C"
				marks={[
					{ at: 3, label: 'lagering' },
					{ at: 18, label: 'cellar' }
				]}
			/>
		</div>
	{/if}

	<section>
		<h3 class="field-label mb-2">How this beer ages</h3>
		<AgeCurve curve={brew.result.ageCurve} />
		{#if hoppy && conditioning.days > 45}
			<p class="mt-2 flex items-start gap-1.5 text-xs text-warn">
				<svg viewBox="0 0 16 16" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
					<path
						d="M8 2 L15 14 L1 14 Z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linejoin="round"
					/>
					<path
						d="M8 6.5 V9.5 M8 11.5 V11.6"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
				</svg>
				Hop aroma is down to {hopAroma.toFixed(1)} out of 10 by the time this is poured. Ageing does not
				improve a hoppy beer.
			</p>
		{/if}
	</section>
</div>
