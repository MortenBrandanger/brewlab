<script lang="ts">
	import { srmToCss, describeAppearance, type Appearance } from '$lib/brewing/appearance';
	import { prefs } from '$lib/state/prefs.svelte';

	let {
		appearance,
		ebc,
		size = 'monitor'
	}: { appearance: Appearance; ebc: number; size?: 'monitor' | 'hero' } = $props();

	// Two glasses can be on the page at once (the monitor and the report), so the
	// gradient and clip-path ids have to be unique or they paint each other.
	const uid = $props.id();
	const glassSheen = `sheen-${uid}`;
	const beerBody = `body-${uid}`;
	const beerGlow = `glow-${uid}`;
	const glassInside = `inside-${uid}`;

	const bubbles = [
		{ x: 26, delay: 0, dur: 5.5, r: 1.6 },
		{ x: 38, delay: 1.4, dur: 6.8, r: 1.1 },
		{ x: 52, delay: 0.7, dur: 4.9, r: 2 },
		{ x: 64, delay: 2.2, dur: 6.1, r: 1.3 },
		{ x: 76, delay: 3.1, dur: 5.2, r: 1.7 },
		{ x: 45, delay: 4, dur: 7.4, r: 0.9 },
		{ x: 70, delay: 1.9, dur: 6.4, r: 1.1 }
	];

	const beer = $derived(srmToCss(appearance.srm));
	const beerTop = $derived(srmToCss(Math.max(0, appearance.srm - 2.5)));
	// Opaque beers scatter light rather than transmit it, so the highlight fades.
	const clarity = $derived(1 - appearance.haze);
	const headHeight = $derived(12 + appearance.head * 30);
	const visibleBubbles = $derived(
		prefs.animate
			? bubbles.slice(0, Math.max(1, Math.round(appearance.carbonation * bubbles.length)))
			: []
	);
	const description = $derived(describeAppearance(appearance, ebc));
</script>

<figure class="m-0 flex flex-col items-center gap-2">
	<svg
		viewBox="0 0 100 170"
		class={size === 'hero' ? 'h-64 w-auto' : 'h-44 w-auto'}
		role="img"
		aria-label={description}
	>
		<defs>
			<linearGradient id={glassSheen} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stop-color="#fff" stop-opacity="0.16" />
				<stop offset="18%" stop-color="#fff" stop-opacity="0.04" />
				<stop offset="82%" stop-color="#fff" stop-opacity="0" />
				<stop offset="100%" stop-color="#fff" stop-opacity="0.1" />
			</linearGradient>
			<linearGradient id={beerBody} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color={beerTop} />
				<stop offset="100%" stop-color={beer} />
			</linearGradient>
			<radialGradient id={beerGlow} cx="0.32" cy="0.3" r="0.75">
				<stop offset="0%" stop-color="#fff" stop-opacity={0.22 * clarity} />
				<stop offset="100%" stop-color="#fff" stop-opacity="0" />
			</radialGradient>
			<clipPath id={glassInside}>
				<path d="M22 26 L78 26 L71 152 Q70 158 64 158 L36 158 Q30 158 29 152 Z" />
			</clipPath>
		</defs>

		<!-- Liquid -->
		<g clip-path="url(#{glassInside})">
			<rect x="18" y="26" width="64" height="140" fill="url(#{beerBody})" />
			<rect x="18" y="26" width="64" height="140" fill="url(#{beerGlow})" />

			{#each visibleBubbles as bubble (bubble.x)}
				<circle
					cx={bubble.x}
					cy="150"
					r={bubble.r}
					fill="#fff"
					opacity={0.34 * clarity + 0.08}
					style="--dur:{bubble.dur}s; --delay:{bubble.delay}s"
					class="bubble"
				/>
			{/each}

			<!-- Foam -->
			<rect x="18" y={26} width="64" height={headHeight} fill="#f6efe0" opacity="0.94" />
			<rect x="18" y={26 + headHeight - 4} width="64" height="4" fill="#e6dbc6" opacity="0.7" />
			<ellipse cx="50" cy={26} rx="30" ry="5" fill="#fffaf0" opacity="0.95" />
		</g>

		<!-- Glass -->
		<path
			d="M22 26 L78 26 L71 152 Q70 158 64 158 L36 158 Q30 158 29 152 Z"
			fill="url(#{glassSheen})"
			stroke="oklch(0.72 0.02 70)"
			stroke-width="1.6"
			stroke-linejoin="round"
		/>
		<ellipse
			cx="50"
			cy="26"
			rx="28"
			ry="4.5"
			fill="none"
			stroke="oklch(0.72 0.02 70)"
			stroke-width="1.4"
		/>
		<ellipse cx="50" cy="162" rx="19" ry="4" fill="oklch(0.3 0.02 62)" opacity="0.6" />
	</svg>
	<figcaption class="sr-only">{description}</figcaption>
</figure>

<style>
	.bubble {
		animation: rise var(--dur) linear var(--delay) infinite;
		will-change: transform;
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
			transform: translateY(-110px) scale(1.15);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bubble {
			animation: none;
			opacity: 0.25;
		}
	}
</style>
