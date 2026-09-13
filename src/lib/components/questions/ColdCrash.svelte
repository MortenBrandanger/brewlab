<script lang="ts">
	/**
	 * Chill it clear before packaging?
	 *
	 * One checkbox, and what saying yes to it means.
	 */
	import { brew } from '$lib/state/brew.svelte';
</script>

<!--
	Last, because it happens last: two or three weeks after the pitch, once
	fermentation is finished. It used to sit beside the pitch rate, which read
	as something you do on the same afternoon.
-->
<label class="flex items-start gap-3 rounded-lg bg-surface p-3 ring-1 ring-line">
	<input
		type="checkbox"
		class="mt-0.5 h-5 w-5 rounded-sm border-line-strong bg-surface text-copper focus-visible:outline-2 focus-visible:outline-amber"
		bind:checked={brew.recipe.fermentation.coldCrash}
	/>
	<span>
		<span class="block text-sm font-medium">Finish by chilling it to near freezing</span>
		<span class="prose-measure block text-xs text-subtle">
			A couple of days in the cold once the schedule above is done. Yeast and haze settle out and
			the beer pours clear. Only worth doing after fermentation has genuinely finished — chill it
			early and the yeast stops before it has cleared up the buttery taste it makes on the way.
		</span>
	</span>
</label>
