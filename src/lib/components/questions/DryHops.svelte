<script lang="ts">
	/**
	 * Any hops into the fermenter?
	 *
	 * Dry hops only — the additions list is the whole answer.
	 */
	import HopAdditions from '../HopAdditions.svelte';
</script>

<section>
	<HopAdditions use="dryHop" />
</section>
