<script lang="ts">
	import { srmToCss } from '$lib/brewing/appearance';
	import { prefs } from '$lib/state/prefs.svelte';

	/**
	 * What is physically in front of you right now.
	 *
	 * The monitor shows this instead of a finished glass, because on the water
	 * stage there is no beer — there is water in a tank. The vessel changes as
	 * the brew day moves, which is most of what makes the process feel like a
	 * process rather than a form.
	 */
	let {
		brewedTo,
		srm,
		haze = 0.2,
		head = 0.5,
		carbonation = 0.6,
		size = 'monitor'
	}: {
		brewedTo: number;
		srm: number;
		haze?: number;
		head?: number;
		carbonation?: number;
		size?: 'monitor' | 'hero';
	} = $props();

	const uid = $props.id();
	const liquidId = `liq-${uid}`;
	const sheenId = `sheen-${uid}`;
	const clipId = `clip-${uid}`;

	type Phase = 'liquor' | 'grist' | 'mash' | 'kettle' | 'fermenter' | 'glass';

	const phase = $derived<Phase>(
		brewedTo < 0
			? 'liquor'
			: brewedTo < 1
				? 'liquor'
				: brewedTo < 2
					? 'grist'
					: brewedTo < 3
						? 'mash'
						: brewedTo < 5
							? 'kettle'
							: brewedTo < 7
								? 'fermenter'
								: 'glass'
	);

	const WATER = 'oklch(0.72 0.055 225)';
	// Nothing is wort-coloured until the grain has actually been in hot water.
	const liquid = $derived(brewedTo >= 2 ? srmToCss(srm) : WATER);
	const liquidTop = $derived(
		brewedTo >= 2 ? srmToCss(Math.max(0, srm - 2.5)) : 'oklch(0.8 0.05 225)'
	);
	const clarity = $derived(1 - haze);
	const moving = $derived(prefs.animate);
	const headHeight = $derived(12 + head * 30);

	const CAPTION: Record<Phase, string> = {
		liquor: 'Hot liquor tank',
		grist: 'Milled grist',
		mash: 'Mash tun',
		kettle: 'Boil kettle',
		fermenter: 'Fermenter',
		glass: 'In the glass'
	};

	const DESCRIPTION: Record<Phase, string> = {
		liquor: 'A tank of treated brewing water, heating up.',
		grist: 'Crushed malt, weighed out and waiting for the mash.',
		mash: 'Grain and hot water resting together while the enzymes work.',
		kettle: 'Wort in the kettle.',
		fermenter: 'Wort in the fermenter, with the yeast at work.',
		glass: 'The finished beer, poured.'
	};

	const bubbles = [
		{ x: 34, delay: 0, dur: 5.5, r: 1.6 },
		{ x: 48, delay: 1.4, dur: 6.8, r: 1.1 },
		{ x: 62, delay: 0.7, dur: 4.9, r: 2 },
		{ x: 76, delay: 2.2, dur: 6.1, r: 1.3 },
		{ x: 55, delay: 3.4, dur: 7.2, r: 0.9 }
	];
	const visibleBubbles = $derived(
		moving && (phase === 'glass' || phase === 'fermenter')
			? bubbles.slice(0, Math.max(1, Math.round(carbonation * bubbles.length)))
			: []
	);
</script>

<figure class="m-0 flex flex-col items-center gap-1.5">
	<svg
		viewBox="0 0 110 170"
		class={size === 'hero' ? 'h-64 w-auto' : 'h-40 w-auto'}
		role="img"
		aria-label={DESCRIPTION[phase]}
	>
		<defs>
			<linearGradient id={liquidId} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color={liquidTop} />
				<stop offset="100%" stop-color={liquid} />
			</linearGradient>
			<linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stop-color="#fff" stop-opacity="0.16" />
				<stop offset="22%" stop-color="#fff" stop-opacity="0.04" />
				<stop offset="82%" stop-color="#fff" stop-opacity="0" />
				<stop offset="100%" stop-color="#fff" stop-opacity="0.1" />
			</linearGradient>
			<clipPath id={clipId}>
				{#if phase === 'glass'}
					<path d="M30 26 L86 26 L79 152 Q78 158 72 158 L44 158 Q38 158 37 152 Z" />
				{:else if phase === 'fermenter'}
					<path d="M36 44 h44 v56 q0 8 -8 8 H44 q-8 0 -8 -8 Z" />
				{:else}
					<rect x="24" y="44" width="62" height="68" rx="5" />
				{/if}
			</clipPath>
		</defs>

		{#if phase === 'glass'}
			<g clip-path="url(#{clipId})">
				<rect x="24" y="26" width="70" height="140" fill="url(#{liquidId})" />
				{#each visibleBubbles as bubble (bubble.x)}
					<circle
						cx={bubble.x + 4}
						cy="150"
						r={bubble.r}
						fill="#fff"
						opacity={0.34 * clarity + 0.08}
						style="--dur:{bubble.dur}s; --delay:{bubble.delay}s"
						class="bubble"
					/>
				{/each}
				<rect x="24" y="26" width="70" height={headHeight} fill="#f6efe0" opacity="0.94" />
				<ellipse cx="58" cy="26" rx="30" ry="5" fill="#fffaf0" opacity="0.95" />
			</g>
			<path
				d="M30 26 L86 26 L79 152 Q78 158 72 158 L44 158 Q38 158 37 152 Z"
				fill="url(#{sheenId})"
				stroke="oklch(0.72 0.02 70)"
				stroke-width="1.6"
				stroke-linejoin="round"
			/>
			<ellipse
				cx="58"
				cy="26"
				rx="28"
				ry="4.5"
				fill="none"
				stroke="oklch(0.72 0.02 70)"
				stroke-width="1.4"
			/>
		{:else if phase === 'fermenter'}
			<!-- Airlock -->
			<path
				d="M58 34 v-10 h10 v-8"
				fill="none"
				stroke="oklch(0.6 0.03 70)"
				stroke-width="3"
				stroke-linecap="round"
			/>
			<circle cx="68" cy="12" r="3.5" fill="oklch(0.7 0.05 225)" class={moving ? 'blip' : ''} />
			<path
				d="M44 34 h28 v10 h8 v56 q0 8 -8 8 H44 q-8 0 -8 -8 V44 h8 Z"
				fill="oklch(0.26 0.02 62)"
				stroke="oklch(0.62 0.03 70)"
				stroke-width="2"
				stroke-linejoin="round"
			/>
			<g clip-path="url(#{clipId})">
				<rect x="36" y="60" width="44" height="48" fill="url(#{liquidId})" />
				{#if brewedTo >= 6}
					<ellipse cx="58" cy="60" rx="24" ry="5" fill="#efe4cd" opacity={0.5 + haze * 0.35} />
				{/if}
				{#each visibleBubbles.slice(0, 3) as bubble (bubble.x)}
					<circle
						cx={bubble.x}
						cy="104"
						r={bubble.r}
						fill="#fff"
						opacity="0.3"
						style="--dur:{bubble.dur}s; --delay:{bubble.delay}s"
						class="bubble"
					/>
				{/each}
			</g>
		{:else}
			<!-- Tank, tun and kettle share a body; the contents are what change. -->
			<rect x="24" y="44" width="62" height="68" rx="5" fill="oklch(0.3 0.02 62)" />
			<g clip-path="url(#{clipId})">
				{#if phase === 'grist'}
					{#each [[34, 96], [48, 90], [62, 98], [76, 92], [41, 104], [56, 106], [70, 104]] as [gx, gy] (gx + '-' + gy)}
						<ellipse
							cx={gx}
							cy={gy}
							rx="6"
							ry="3.6"
							fill="oklch(0.68 0.085 75)"
							transform="rotate(-18 {gx} {gy})"
						/>
					{/each}
				{:else if phase === 'mash'}
					<rect x="24" y="72" width="62" height="40" fill="oklch(0.45 0.06 72)" />
					<rect x="24" y="64" width="62" height="10" fill="url(#{liquidId})" opacity="0.9" />
					{#if moving}
						<circle cx="46" cy="70" r="2" fill="#fff" opacity="0.25" class="steam" />
						<circle
							cx="66"
							cy="70"
							r="1.6"
							fill="#fff"
							opacity="0.2"
							class="steam"
							style="animation-delay:1.1s"
						/>
					{/if}
				{:else}
					<rect
						x="24"
						y={phase === 'kettle' ? 58 : 66}
						width="62"
						height="54"
						fill="url(#{liquidId})"
					/>
					{#if phase === 'kettle' && brewedTo === 4 && moving}
						{#each [[36, 3], [50, 4.4], [64, 3.2], [78, 4.8]] as [bx, br], i (bx)}
							<circle
								cx={bx}
								cy="104"
								r={br}
								fill="#fff"
								opacity="0.3"
								class="boil"
								style="animation-delay:{i * 0.36}s"
							/>
						{/each}
					{/if}
					<ellipse
						cx="55"
						cy={phase === 'kettle' ? 58 : 66}
						rx="30"
						ry="4"
						fill="#fff"
						opacity="0.16"
					/>
				{/if}
			</g>
			<rect
				x="24"
				y="44"
				width="62"
				height="68"
				rx="5"
				fill="url(#{sheenId})"
				stroke="oklch(0.66 0.045 60)"
				stroke-width="2.5"
			/>
			<rect x="20" y="38" width="70" height="8" rx="3" fill="oklch(0.5 0.05 55)" />
			<path d="M86 62 h10 v18 h-10" fill="none" stroke="oklch(0.5 0.05 55)" stroke-width="3" />
			{#if phase === 'liquor'}
				<path d="M55 30 v-14" stroke="oklch(0.5 0.05 55)" stroke-width="4" stroke-linecap="round" />
				<path d="M40 16 h15" stroke="oklch(0.5 0.05 55)" stroke-width="4" stroke-linecap="round" />
			{/if}
		{/if}

		<ellipse cx="55" cy="164" rx="24" ry="4" fill="oklch(0.28 0.02 62)" opacity="0.55" />
	</svg>
	<figcaption class="text-xs text-subtle">{CAPTION[phase]}</figcaption>
</figure>

<style>
	.bubble {
		animation: rise var(--dur) linear var(--delay) infinite;
	}
	.boil {
		animation: boil-up 1.9s ease-out infinite;
	}
	.steam {
		animation: steam 3.4s ease-out infinite;
	}
	.blip {
		animation: blip 2.6s ease-in-out infinite;
	}
	@keyframes rise {
		from {
			transform: translateY(0) scale(0.7);
			opacity: 0;
		}
		12% {
			opacity: 1;
		}
		to {
			transform: translateY(-100px) scale(1.15);
			opacity: 0;
		}
	}
	@keyframes boil-up {
		from {
			transform: translateY(0) scale(0.6);
			opacity: 0;
		}
		25% {
			opacity: 0.4;
		}
		to {
			transform: translateY(-40px) scale(1.2);
			opacity: 0;
		}
	}
	@keyframes steam {
		from {
			transform: translateY(0) scale(0.8);
			opacity: 0;
		}
		30% {
			opacity: 0.3;
		}
		to {
			transform: translateY(-22px) scale(1.6);
			opacity: 0;
		}
	}
	@keyframes blip {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bubble,
		.boil,
		.steam,
		.blip {
			animation: none;
		}
	}
</style>
