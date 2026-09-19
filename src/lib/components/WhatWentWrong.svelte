<script lang="ts">
	import Glossed from './Glossed.svelte';
	import { SENSORY_KEYS, SENSORY_LABELS } from '$lib/brewing/sensory';
	import { diagnose, TASTEABLE, type Explanation } from '$lib/brewing/diagnose';
	import type { Recipe, SensoryKey, SensoryVector } from '$lib/brewing/types';

	let {
		recipe,
		predicted,
		predictedHaze
	}: { recipe: Recipe; predicted: SensoryVector; predictedHaze: number } = $props();

	/**
	 * Nothing is claimed until it is ticked, and that is the whole design.
	 *
	 * A slider that starts on the predicted value and sits there is silently saying "this
	 * axis came out exactly as the model says", which is a claim nobody made. The engine
	 * takes an absent axis to mean nobody looked and a present one to mean somebody
	 * tasted, and those two must never be confused — so every axis is off until a person
	 * says otherwise, and the slider only appears once they have.
	 */
	let noticed = $state<Partial<Record<SensoryKey, boolean>>>({});
	let values = $state<Partial<Record<SensoryKey, number>>>({});
	let tasted = $state<Record<string, boolean>>({});
	let hazeNoticed = $state(false);
	// Resolved when it is first ticked rather than at setup, for the same reason the axes
	// are: reading a prop into state at creation freezes whichever beer happened to be in
	// the glass then, and the report is rebuilt as the recipe changes underneath it.
	let haze = $state<number | null>(null);

	function toggle(key: SensoryKey) {
		noticed[key] = !noticed[key];
		if (noticed[key] && values[key] === undefined) values[key] = Math.round(predicted[key]);
	}

	function toggleHaze() {
		hazeNoticed = !hazeNoticed;
		if (hazeNoticed && haze === null) haze = Math.round(predictedHaze * 10);
	}

	const observation = $derived({
		sensory: Object.fromEntries(
			SENSORY_KEYS.filter((k) => noticed[k]).map((k) => [k, values[k] ?? predicted[k]])
		) as Partial<SensoryVector>,
		faults: Object.keys(tasted).filter((c) => tasted[c]),
		haze: hazeNoticed && haze !== null ? haze / 10 : undefined
	});

	const said = $derived(
		Object.keys(observation.sensory).length + observation.faults.length + (hazeNoticed ? 1 : 0)
	);
	const explanations = $derived(said === 0 ? [] : diagnose(recipe, observation));

	const asWord = (n: number) =>
		n < 1.5 ? 'none' : n < 3.5 ? 'a little' : n < 6.5 ? 'noticeable' : n < 8.5 ? 'strong' : 'huge';

	/** How far off the recipe's own prediction this axis was marked. */
	const drift = (key: SensoryKey) => (values[key] ?? predicted[key]) - predicted[key];

	const confidence = (e: Explanation) =>
		e.closes >= 0.6 ? 'Very likely' : e.closes >= 0.35 ? 'Likely' : 'Possible';
</script>

<!--
	The report above says what this recipe makes. This says what you made.

	Everything else in the app runs the model forwards; this is the only place it runs
	backwards, and the difference matters to how it reads: it does not tell you what went
	wrong, it tells you what would have to have happened, and hands you the question to
	check it against. The brewer knows what the room was like that week and the model
	never will.
-->
<div class="space-y-5">
	<p class="prose-measure text-sm text-muted">
		The report above is the beer this recipe makes. If what you poured was different, mark what you
		actually got — only the things you noticed — and the model will work backwards through the ways
		a brew day drifts from the page.
	</p>

	<div>
		<h4 class="field-label mb-2">What was it like?</h4>
		<div class="grid gap-x-8 gap-y-1 sm:grid-cols-2">
			{#each SENSORY_KEYS as key (key)}
				<div class="py-1">
					<label class="flex cursor-pointer items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={!!noticed[key]}
							onchange={() => toggle(key)}
							class="h-4 w-4 accent-[var(--color-copper)]"
						/>
						<span class={noticed[key] ? 'font-semibold' : 'text-muted'}>
							{SENSORY_LABELS[key]}
						</span>
						{#if !noticed[key]}
							<span class="text-xs text-subtle">didn't notice</span>
						{/if}
					</label>
					{#if noticed[key]}
						<div class="mt-1 flex items-center gap-3 pl-6">
							<input
								type="range"
								min="0"
								max="10"
								step="1"
								bind:value={values[key]}
								aria-label="{SENSORY_LABELS[key]} in the glass"
								class="h-1 flex-1 accent-[var(--color-copper)]"
							/>
							<span class="w-28 text-right text-xs text-muted tabular-nums">
								{values[key]} · {asWord(values[key] ?? 0)}
							</span>
						</div>
						<p class="pl-6 text-xs text-subtle">
							the recipe says {predicted[key].toFixed(1)}{#if Math.abs(drift(key)) >= 0.5}, so that
								is {Math.abs(drift(key)).toFixed(1)}
								{drift(key) > 0 ? 'more' : 'less'}{/if}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div>
		<h4 class="field-label mb-2">Did you taste any of these?</h4>
		<div class="grid gap-1 sm:grid-cols-2">
			{#each TASTEABLE as fault (fault.code)}
				<label class="flex cursor-pointer items-start gap-2 py-1 text-sm">
					<input
						type="checkbox"
						bind:checked={tasted[fault.code]}
						class="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-copper)]"
					/>
					<span>
						<span class={tasted[fault.code] ? 'font-semibold' : ''}>{fault.label}</span>
						<span class="block text-xs text-subtle">{fault.hint}</span>
					</span>
				</label>
			{/each}
		</div>
	</div>

	<div>
		<label class="flex cursor-pointer items-center gap-2 text-sm">
			<input
				type="checkbox"
				checked={hazeNoticed}
				onchange={toggleHaze}
				class="h-4 w-4 accent-[var(--color-copper)]"
			/>
			<span class={hazeNoticed ? 'font-semibold' : 'text-muted'}>How clear was it?</span>
			{#if !hazeNoticed}<span class="text-xs text-subtle">didn't notice</span>{/if}
		</label>
		{#if hazeNoticed}
			<div class="mt-1 flex items-center gap-3 pl-6">
				<input
					type="range"
					min="0"
					max="10"
					step="1"
					bind:value={haze}
					aria-label="How cloudy the beer was"
					class="h-1 flex-1 accent-[var(--color-copper)]"
				/>
				<span class="w-28 text-right text-xs text-muted tabular-nums">
					{(haze ?? 0) === 0
						? 'bright'
						: (haze ?? 0) < 4
							? 'a slight haze'
							: (haze ?? 0) < 8
								? 'cloudy'
								: 'opaque'}
				</span>
			</div>
			<p class="pl-6 text-xs text-subtle">
				the recipe says {predictedHaze < 0.15
					? 'bright'
					: predictedHaze < 0.4
						? 'a slight haze'
						: predictedHaze < 0.75
							? 'cloudy'
							: 'opaque'}
			</p>
		{/if}
	</div>

	{#if said === 0}
		<p class="rounded-lg bg-surface p-3 text-xs text-subtle ring-1 ring-line">
			Tick something above and the explanations appear here.
		</p>
	{:else if explanations.length === 0}
		<!--
			The honest answer, and the one a brewer can act on. A brew day has more ways of
			going wrong than the thirteen this searches, and something that explains a tenth
			of the gap is not an explanation.
		-->
		<div class="rounded-lg bg-surface p-4 ring-1 ring-line">
			<h4 class="font-display text-sm font-semibold">Nothing ordinary explains this</h4>
			<p class="prose-measure mt-1 text-xs text-muted">
				None of the usual ways a brew day drifts would produce what you have described. That makes
				it worth checking the recipe itself rather than the day: the ingredients, the volumes, or
				the water. It can also mean the beer is simply doing what the recipe says and the
				disappointment is with the recipe.
			</p>
		</div>
	{:else}
		<div>
			<h4 class="field-label mb-2">What would have to have happened</h4>
			<ul class="space-y-3">
				{#each explanations.slice(0, 4) as e (e.code)}
					<li class="rounded-lg bg-surface p-4 ring-1 ring-line">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<h5 class="font-display text-sm font-semibold">
								{e.label}{#if e.unit && e.magnitude}
									<span class="font-normal text-muted"> — about {e.magnitude} {e.unit}</span>
								{/if}
							</h5>
							<span class="text-xs text-subtle tabular-nums">
								{confidence(e)} · explains {Math.round(e.closes * 100)}%
							</span>
						</div>
						<p class="prose-measure mt-1 text-sm text-copper-text">{e.question}</p>
						{#if e.explains.length}
							<p class="prose-measure mt-2 text-xs text-muted">
								Would put
								{#each e.explains.slice(0, 3) as m, i (m.key)}{i > 0
										? i === Math.min(3, e.explains.length) - 1
											? ' and '
											: ', '
										: ''}{SENSORY_LABELS[m.key].toLowerCase()} at {m.would.toFixed(1)} against the
									{m.observed.toFixed(1)} you tasted{/each}.
							</p>
						{/if}
						{#if e.faultsExplained.length}
							<p class="prose-measure mt-1 text-xs text-muted">
								Accounts for the {e.faultsExplained
									.map((c) => TASTEABLE.find((t) => t.code === c)?.label.toLowerCase() ?? c)
									.join(' and the ')}.
							</p>
						{/if}
						{#if e.harms.length}
							<!--
								An explanation that only lists what it improves is an advertisement. If this
								would have spoiled something the drinker said was fine, it says so here and
								the reader can weigh it.
							-->
							<p class="prose-measure mt-1 text-xs text-warn-bright">
								But it would also have moved {e.harms
									.map((m) => SENSORY_LABELS[m.key].toLowerCase())
									.join(' and ')} the wrong way, so on its own it is not the whole story.
							</p>
						{/if}
					</li>
				{/each}
			</ul>
			<p class="prose-measure mt-3 text-xs text-subtle">
				<Glossed
					text="These are hypotheses, not verdicts. The model knows what each mistake does to a beer; it does not know what your kitchen was like that week. The question under each one is the part only you can answer."
				/>
			</p>
		</div>
	{/if}
</div>
