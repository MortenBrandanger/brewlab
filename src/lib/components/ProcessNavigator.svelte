<script lang="ts">
	import { STAGES, stageIndex, type StageId } from '$lib/state/stages';
	import { brew } from '$lib/state/brew.svelte';

	let { current, onselect }: { current: StageId; onselect: (id: StageId) => void } = $props();

	const currentIndex = $derived(stageIndex(current));
	let list = $state<HTMLElement>();

	// Keep the active stage in view when navigating with the keyboard on narrow screens.
	$effect(() => {
		const active = list?.querySelector('[aria-current="step"]');
		active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
	});
</script>

<nav aria-label="Brewing stages" class="border-b border-line bg-surface-2/80 backdrop-blur-sm">
	<ol
		bind:this={list}
		class="mx-auto flex max-w-[100rem] snap-x [scrollbar-width:thin] gap-0.5 overflow-x-auto px-3 py-2 sm:px-5"
	>
		{#each STAGES as stage, index (stage.id)}
			{@const done = index <= brew.brewedTo}
			{@const active = index === currentIndex}
			{@const ahead = index > brew.brewedTo + 1}
			<li class="flex shrink-0 snap-center items-center">
				<!--
					Going back is free and going forward is not. A brew day is
					iterative — you change the grain and watch what it does — but there
					is no jumping to the glass from the water. Letting the reader do
					that is what made the app hand over a finished beer before anything
					had been brewed, and it needed an apology in the action bar
					("you have skipped ahead") to paper over it.
				-->
				<svelte:element
					this={ahead ? 'span' : 'button'}
					role={ahead ? undefined : 'button'}
					type={ahead ? undefined : 'button'}
					tabindex={ahead ? undefined : 0}
					onclick={ahead ? undefined : () => onselect(stage.id)}
					onkeydown={ahead
						? undefined
						: (event: KeyboardEvent) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									onselect(stage.id);
								}
							}}
					aria-current={active ? 'step' : undefined}
					aria-disabled={ahead ? 'true' : undefined}
					class="group flex min-h-11 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors
						{active
						? 'bg-copper text-ink'
						: done
							? 'cursor-pointer text-fg hover:bg-ui-hover'
							: ahead
								? 'cursor-default text-subtle'
								: 'cursor-pointer text-muted hover:bg-ui-hover hover:text-fg'}"
				>
					<span
						class="tnum grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold
							{active ? 'bg-ink/25 text-ink' : done ? 'bg-hop-dim text-fg' : 'bg-ui-active text-muted'}"
						aria-hidden="true"
					>
						{#if done}
							<svg viewBox="0 0 16 16" class="h-3 w-3"
								><path
									d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
									fill="none"
									stroke="currentColor"
									stroke-width="2.2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
						{:else}
							{index + 1}
						{/if}
					</span>
					{stage.name}
					<span class="sr-only">
						{done ? '(done)' : index === brew.brewedTo + 1 ? '(up next)' : '(not reached yet)'}
					</span>
				</svelte:element>
				{#if index < STAGES.length - 1}
					<span
						class="mx-0.5 h-px w-3 shrink-0 {index < brew.brewedTo ? 'bg-copper-dim' : 'bg-line'}"
						aria-hidden="true"
					></span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
