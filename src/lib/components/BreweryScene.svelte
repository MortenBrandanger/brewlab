<script lang="ts">
	import { srmToCss } from '$lib/brewing/appearance';
	import { prefs } from '$lib/state/prefs.svelte';
	import type { StageId } from '$lib/state/stages';

	let { stage, srm, haze }: { stage: StageId; srm: number; haze: number } = $props();

	const uid = $props.id();
	const vesselId = `vessel-${uid}`;
	const wortId = `wort-${uid}`;

	const liquid = $derived(srmToCss(srm));
	const liquidLight = $derived(srmToCss(Math.max(0, srm - 3)));
	const clarity = $derived(1 - haze);
	const moving = $derived(prefs.animate);
</script>

<!-- Decorative: the stage is named in text beside this. -->
<div class="pointer-events-none select-none" aria-hidden="true">
	<svg viewBox="0 0 160 110" class="h-24 w-auto">
		<defs>
			<linearGradient id={vesselId} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" stop-color="oklch(0.42 0.06 45)" />
				<stop offset="35%" stop-color="oklch(0.62 0.09 48)" />
				<stop offset="70%" stop-color="oklch(0.45 0.06 45)" />
				<stop offset="100%" stop-color="oklch(0.34 0.045 45)" />
			</linearGradient>
			<linearGradient id={wortId} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color={liquidLight} />
				<stop offset="100%" stop-color={liquid} />
			</linearGradient>
		</defs>

		{#if stage === 'water'}
			<path d="M78 6 L78 24" stroke="oklch(0.55 0.05 45)" stroke-width="6" stroke-linecap="round" />
			<path d="M60 12 H78" stroke="oklch(0.55 0.05 45)" stroke-width="6" stroke-linecap="round" />
			<circle cx="78" cy="36" r="3.5" fill="oklch(0.78 0.07 220)" class={moving ? 'drop' : ''} />
			<circle
				cx="78"
				cy="52"
				r="2.6"
				fill="oklch(0.78 0.07 220)"
				opacity="0.7"
				class={moving ? 'drop drop-2' : ''}
			/>
			<rect x="46" y="58" width="64" height="42" rx="6" fill="url(#{vesselId})" />
			<rect
				x="50"
				y="70"
				width="56"
				height="26"
				rx="4"
				fill="oklch(0.62 0.06 220)"
				opacity="0.75"
			/>
		{:else if stage === 'grain'}
			<path
				d="M44 44 Q50 30 62 30 H98 Q110 30 116 44 L120 98 Q120 102 116 102 H44 Q40 102 40 98 Z"
				fill="oklch(0.42 0.05 70)"
			/>
			<path d="M44 44 Q80 52 116 44" fill="none" stroke="oklch(0.55 0.06 70)" stroke-width="2" />
			{#each [[58, 58], [74, 54], [90, 60], [66, 72], [84, 76], [100, 66], [72, 88], [94, 90]] as [gx, gy] (gx + '-' + gy)}
				<ellipse
					cx={gx}
					cy={gy}
					rx="5"
					ry="3.2"
					fill="oklch(0.72 0.09 75)"
					transform="rotate(-18 {gx} {gy})"
				/>
				<path d="M{gx - 4} {gy} h8" stroke="oklch(0.52 0.06 70)" stroke-width="0.8" />
			{/each}
		{:else if stage === 'mash' || stage === 'sparge'}
			<rect x="34" y="26" width="92" height="70" rx="8" fill="url(#{vesselId})" />
			<rect x="40" y="48" width="80" height="42" rx="5" fill="oklch(0.45 0.06 72)" />
			<rect x="40" y="42" width="80" height="10" rx="4" fill="url(#{wortId})" opacity="0.85" />
			{#if stage === 'sparge'}
				<path d="M50 12 H110" stroke="oklch(0.6 0.05 45)" stroke-width="4" stroke-linecap="round" />
				{#each [58, 72, 86, 100] as sx (sx)}
					<circle
						cx={sx}
						cy="22"
						r="2"
						fill="oklch(0.8 0.05 220)"
						class={moving ? 'drop' : ''}
						style="animation-delay:{(sx % 30) / 20}s"
					/>
				{/each}
			{:else}
				<path
					d="M92 18 L104 60"
					stroke="oklch(0.62 0.05 60)"
					stroke-width="4"
					stroke-linecap="round"
				/>
				<ellipse cx="104" cy="62" rx="10" ry="4" fill="oklch(0.5 0.05 60)" />
			{/if}
		{:else if stage === 'boil'}
			<rect x="34" y="30" width="92" height="66" rx="8" fill="url(#{vesselId})" />
			<rect x="40" y="44" width="80" height="46" rx="5" fill="url(#{wortId})" />
			{#each [[52, 3, 0], [66, 4.5, 0.35], [80, 3.4, 0.7], [94, 5, 1.05], [108, 3.8, 1.4]] as [bx, br, delay] (bx)}
				<circle
					cx={bx}
					cy="84"
					r={br}
					fill="#fff"
					opacity="0.3"
					class={moving ? 'boil' : ''}
					style="animation-delay:{delay}s"
				/>
			{/each}
			<ellipse cx="80" cy="46" rx="40" ry="5" fill="#fff" opacity="0.18" />
			{#each [[46, 22], [112, 18]] as [hx, hy] (hx)}
				<g transform="translate({hx} {hy})">
					<ellipse cx="0" cy="0" rx="5" ry="8" fill="oklch(0.6 0.12 140)" />
					<path d="M0 -8 V8" stroke="oklch(0.45 0.1 140)" stroke-width="1" />
				</g>
			{/each}
			<path
				d="M60 22 q8 -10 16 0"
				fill="none"
				stroke="oklch(0.75 0.02 70)"
				stroke-width="2"
				opacity="0.35"
			/>
		{:else if stage === 'chill'}
			<rect x="34" y="30" width="92" height="66" rx="8" fill="url(#{vesselId})" />
			<rect x="40" y="44" width="80" height="46" rx="5" fill="url(#{wortId})" />
			<path
				d="M58 34 v18 h44 v10 h-44 v10 h44 v10"
				fill="none"
				stroke="oklch(0.74 0.05 210)"
				stroke-width="4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			{#each [[44, 24], [118, 28]] as [fx, fy] (fx)}
				<path
					d="M{fx} {fy - 6} v12 M{fx - 5} {fy - 3} l10 6 M{fx + 5} {fy - 3} l-10 6"
					stroke="oklch(0.82 0.06 220)"
					stroke-width="1.6"
					stroke-linecap="round"
				/>
			{/each}
		{:else if stage === 'ferment'}
			<path
				d="M62 20 h36 v14 l18 22 v40 q0 6 -6 6 H50 q-6 0 -6 -6 V56 l18 -22 Z"
				fill="oklch(0.28 0.02 62)"
				opacity="0.6"
				stroke="oklch(0.62 0.03 70)"
				stroke-width="2"
			/>
			<path d="M48 62 h64 v34 q0 4 -4 4 H52 q-4 0 -4 -4 Z" fill="url(#{wortId})" />
			<ellipse cx="80" cy="62" rx="32" ry="4.5" fill="#efe4cd" opacity={0.55 + haze * 0.3} />
			{#each [[62, 1.8, 0], [76, 2.4, 0.8], [92, 1.5, 1.6], [84, 2, 2.4]] as [bx, br, delay] (bx)}
				<circle
					cx={bx}
					cy="94"
					r={br}
					fill="#fff"
					opacity={0.3 * clarity + 0.1}
					class={moving ? 'rise' : ''}
					style="animation-delay:{delay}s"
				/>
			{/each}
			<path
				d="M80 20 v-8 h10 v-6"
				fill="none"
				stroke="oklch(0.62 0.03 70)"
				stroke-width="3"
				stroke-linecap="round"
			/>
			<circle cx="90" cy="4" r="3" fill="oklch(0.7 0.05 220)" class={moving ? 'blip' : ''} />
		{:else if stage === 'condition'}
			{#each [40, 66, 92] as bx (bx)}
				<g transform="translate({bx} 18)">
					<path
						d="M8 0 h12 v18 l7 12 v56 q0 4 -4 4 H5 q-4 0 -4 -4 V30 l7 -12 Z"
						fill="oklch(0.3 0.03 130)"
						stroke="oklch(0.5 0.04 130)"
						stroke-width="1.5"
					/>
					<path d="M1 44 h26 v42 q0 4 -4 4 H5 q-4 0 -4 -4 Z" fill="url(#{wortId})" opacity="0.9" />
					<rect x="7" y="-2" width="14" height="6" rx="2" fill="oklch(0.58 0.08 48)" />
				</g>
			{/each}
			<path
				d="M126 34 h20 M126 44 h20 M126 54 h14"
				stroke="oklch(0.45 0.03 62)"
				stroke-width="2"
				stroke-linecap="round"
			/>
		{:else}
			<ellipse cx="80" cy="100" rx="30" ry="5" fill="oklch(0.3 0.02 62)" opacity="0.5" />
			<path
				d="M56 18 h48 l-6 76 q-1 6 -7 6 H69 q-6 0 -7 -6 Z"
				fill="url(#{wortId})"
				stroke="oklch(0.72 0.02 70)"
				stroke-width="2"
			/>
			<rect x="57" y="18" width="46" height="14" fill="#f6efe0" opacity="0.9" />
		{/if}
	</svg>
</div>

<style>
	.drop {
		animation: fall 1.6s ease-in infinite;
	}
	.drop-2 {
		animation-delay: 0.8s;
	}
	.boil {
		animation: bubble 1.9s ease-out infinite;
	}
	.rise {
		animation: slow-rise 4.5s linear infinite;
	}
	.blip {
		animation: blip 2.6s ease-in-out infinite;
	}
	@keyframes fall {
		from {
			transform: translateY(-14px);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		to {
			transform: translateY(26px);
			opacity: 0;
		}
	}
	@keyframes bubble {
		from {
			transform: translateY(0) scale(0.6);
			opacity: 0;
		}
		25% {
			opacity: 0.4;
		}
		to {
			transform: translateY(-36px) scale(1.2);
			opacity: 0;
		}
	}
	@keyframes slow-rise {
		from {
			transform: translateY(0);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		to {
			transform: translateY(-30px);
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
		.drop,
		.boil,
		.rise,
		.blip {
			animation: none;
		}
	}
</style>
