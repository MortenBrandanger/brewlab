<script lang="ts">
	/**
	 * One question, and only the controls that answer it.
	 *
	 * Every question component takes no props and reads the recipe from the
	 * store, so this is a plain switch rather than a registry: the one place that
	 * knows which markup answers which question.
	 */
	import WaterProfile from './questions/WaterProfile.svelte';
	import GrainMalts from './questions/GrainMalts.svelte';
	import MashFinish from './questions/MashFinish.svelte';
	import MashLanding from './questions/MashLanding.svelte';
	import BatchSize from './questions/BatchSize.svelte';
	import SpargeStop from './questions/SpargeStop.svelte';
	import BoilTime from './questions/BoilTime.svelte';
	import KettleHops from './questions/KettleHops.svelte';
	import FlameoutHops from './questions/FlameoutHops.svelte';
	import ChillMethod from './questions/ChillMethod.svelte';
	import Transfer from './questions/Transfer.svelte';
	import YeastChoice from './questions/YeastChoice.svelte';
	import PitchRate from './questions/PitchRate.svelte';
	import FermentTemp from './questions/FermentTemp.svelte';
	import FermentDays from './questions/FermentDays.svelte';
	import DryHops from './questions/DryHops.svelte';
	import ColdCrash from './questions/ColdCrash.svelte';
	import Packaging from './questions/Packaging.svelte';
	import Carbonation from './questions/Carbonation.svelte';
	import Storage from './questions/Storage.svelte';
	import TasteStage from './stages/TasteStage.svelte';

	import type { StageId } from '$lib/state/stages';

	let { id, onadjust }: { id: string; onadjust: (stage: StageId) => void } = $props();
</script>

{#if id === 'water-profile'}
	<WaterProfile />
{:else if id === 'grain-malts'}
	<GrainMalts />
{:else if id === 'mash-finish'}
	<MashFinish />
{:else if id === 'mash-landed'}
	<MashLanding />
{:else if id === 'batch-size'}
	<BatchSize />
{:else if id === 'sparge-rig'}
	<SpargeStop />
{:else if id === 'boil-time'}
	<BoilTime />
{:else if id === 'kettle-hops'}
	<KettleHops />
{:else if id === 'flameout-hops'}
	<FlameoutHops />
{:else if id === 'chill-method'}
	<ChillMethod />
{:else if id === 'transfer'}
	<Transfer />
{:else if id === 'yeast'}
	<YeastChoice />
{:else if id === 'pitch-rate'}
	<PitchRate />
{:else if id === 'ferment-temp'}
	<FermentTemp />
{:else if id === 'ferment-days'}
	<FermentDays />
{:else if id === 'dry-hops'}
	<DryHops />
{:else if id === 'cold-crash'}
	<ColdCrash />
{:else if id === 'packaging'}
	<Packaging />
{:else if id === 'carbonation'}
	<Carbonation />
{:else if id === 'storage'}
	<Storage />
{:else}
	<TasteStage {onadjust} />
{/if}
