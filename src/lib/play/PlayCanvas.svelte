<script lang="ts">
	/**
	 * The window onto the bench: one canvas, one animation loop, one pointer.
	 *
	 * A step hands this two functions. `tick` advances whatever the step is
	 * simulating — the heat in a tun, the clock on a boil — and `draw` paints
	 * the foreground. This component paints the workshop behind and the lamp
	 * light over it, keeps the canvas sharp on any screen, and turns the
	 * pointer into scene coordinates with a velocity, because stirring is
	 * measured in how fast you move.
	 *
	 * With motion turned off the loop still runs, so the brew-day clock still
	 * counts; the step's `calm` flag tells the scene to draw everything where
	 * it ends up rather than letting it drift.
	 */
	import { onMount } from 'svelte';
	import { prefs } from '$lib/state/prefs.svelte';
	import { H, W, Workshop, approach, readPalette, type Palette, type PointerInput } from './kit';

	let {
		tick,
		draw,
		pan = 0,
		label,
		cursor = 'default'
	}: {
		tick: (dt: number, input: PointerInput, calm: boolean) => void;
		draw: (ctx: CanvasRenderingContext2D, pal: Palette, calm: boolean) => void;
		/** 0–1 along the workshop wall. */
		pan?: number;
		/** What the picture shows, for anyone who cannot see it. */
		label: string;
		cursor?: string;
	} = $props();

	let canvas = $state<HTMLCanvasElement>();
	const input: PointerInput = {
		x: W / 2,
		y: H / 2,
		vx: 0,
		vy: 0,
		down: false,
		pressed: false,
		released: false,
		present: false
	};
	let lastMove = 0;

	function toScene(e: PointerEvent) {
		const rect = canvas!.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) / rect.width) * W,
			y: ((e.clientY - rect.top) / rect.height) * H
		};
	}

	function onmove(e: PointerEvent) {
		const p = toScene(e);
		const now = performance.now();
		const dt = Math.max(0.008, (now - lastMove) / 1000);
		lastMove = now;
		// Smoothed, so one jittery event does not read as a violent stir.
		input.vx = input.vx * 0.6 + ((p.x - input.x) / dt) * 0.4;
		input.vy = input.vy * 0.6 + ((p.y - input.y) / dt) * 0.4;
		input.x = p.x;
		input.y = p.y;
		input.present = true;
	}

	onMount(() => {
		const ctx = canvas!.getContext('2d')!;
		const workshop = new Workshop();
		let pal = readPalette();
		let scale = 1;
		let camera = pan;
		let frame = 0;
		let last = performance.now();

		const resize = () => {
			const rect = canvas!.getBoundingClientRect();
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas!.width = Math.round(rect.width * dpr);
			canvas!.height = Math.round(rect.height * dpr);
			scale = canvas!.width / W;
		};
		const observer = new ResizeObserver(resize);
		observer.observe(canvas!);
		resize();

		const loop = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			const calm = !prefs.animate;
			// Velocity decays when the pointer stops moving, or a still hand
			// would keep stirring.
			if (now - lastMove > 60) {
				input.vx *= 0.7;
				input.vy *= 0.7;
			}
			tick(dt, input, calm);
			input.pressed = false;
			input.released = false;

			camera = calm ? pan : approach(camera, pan, 3.2, dt);
			ctx.setTransform(scale, 0, 0, scale, 0, 0);
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			workshop.drawBack(ctx, pal, camera, scale);
			workshop.drawBench(ctx, pal, camera, scale);
			draw(ctx, pal, calm);
			workshop.drawLight(ctx, pal);
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);

		// Fonts arriving late would otherwise leave the first tags in a fallback.
		void document.fonts?.ready.then(() => (pal = readPalette()));

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="block aspect-[8/5] w-full touch-none rounded-lg bg-surface select-none"
	style="cursor:{cursor}"
	onpointermove={onmove}
	onpointerdown={(e) => {
		canvas?.setPointerCapture(e.pointerId);
		onmove(e);
		input.vx = 0;
		input.vy = 0;
		input.down = true;
		input.pressed = true;
	}}
	onpointerup={() => {
		input.down = false;
		input.released = true;
	}}
	onpointercancel={() => {
		input.down = false;
		input.released = true;
	}}
	onpointerleave={() => {
		if (!input.down) input.present = false;
	}}>{label}</canvas
>
