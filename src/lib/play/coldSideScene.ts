/**
 * The vessels of the cold side, shared by the sanitise, chill and transfer
 * benches: the stainless kettle the boil finished in, and the white plastic
 * bucket the beer will ferment in.
 *
 * Both are drawn the way the mash tun is: a cutaway for the kettle, so you see
 * the wort and the coil in it, and a translucent bucket for the fermenter,
 * because a real fermenting bucket is thin white plastic you can read the
 * level through. Same light as everywhere else — one lamp above, a lit rim,
 * shaded feet and a soft contact shadow on the bench.
 */

import { alpha, contactShadow, cylinder, type Palette } from './kit';

export type Box = { left: number; right: number; top: number; bottom: number };

const RIM_RY = 18;

/** The inside of a vessel with a rounded bottom, for clipping its contents. */
export function interiorPath(ctx: CanvasRenderingContext2D, b: Box, radius = 18) {
	ctx.beginPath();
	ctx.moveTo(b.left, b.top);
	ctx.lineTo(b.left, b.bottom - radius);
	ctx.quadraticCurveTo(b.left, b.bottom, b.left + radius, b.bottom);
	ctx.lineTo(b.right - radius, b.bottom);
	ctx.quadraticCurveTo(b.right, b.bottom, b.right, b.bottom - radius);
	ctx.lineTo(b.right, b.top);
	ctx.closePath();
}

/**
 * A stainless kettle drawn as a cutaway. `inside` paints the contents and is
 * clipped to the interior; `front` paints whatever crosses the rim towards you
 * (a coil's pipes, a siphon cane) after the walls.
 */
export function drawSteelKettle(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	b: Box,
	inside: () => void,
	front?: () => void,
	wall = 11
) {
	const cx = (b.left + b.right) / 2;
	const halfW = (b.right - b.left) / 2;
	contactShadow(ctx, pal, cx, b.bottom + wall + 2, halfW + 30, 0.7);

	// Handles, riveted on the outside.
	for (const side of [-1, 1]) {
		const x = side < 0 ? b.left - wall : b.right + wall;
		ctx.strokeStyle = pal.steelDark;
		ctx.lineWidth = 11;
		ctx.beginPath();
		ctx.arc(
			x,
			b.top + 58,
			22,
			side < 0 ? Math.PI / 2 : -Math.PI / 2,
			side < 0 ? -Math.PI / 2 : Math.PI / 2
		);
		ctx.stroke();
		ctx.strokeStyle = pal.steelLight;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(
			x,
			b.top + 58,
			22,
			side < 0 ? Math.PI * 0.95 : -Math.PI * 0.45,
			side < 0 ? Math.PI * 1.35 : Math.PI * 0.05
		);
		ctx.stroke();
	}

	// The back wall seen from inside: brushed steel in shadow.
	ctx.save();
	interiorPath(ctx, b);
	ctx.clip();
	const back = ctx.createLinearGradient(0, b.top, 0, b.bottom);
	back.addColorStop(0, pal.steel);
	back.addColorStop(1, pal.steelDark);
	ctx.fillStyle = back;
	ctx.fillRect(b.left, b.top - RIM_RY, b.right - b.left, b.bottom - b.top + RIM_RY);
	ctx.fillStyle = cylinder(
		ctx,
		b.left,
		b.right,
		alpha(pal.steelLight, 0.25),
		alpha(pal.steel, 0),
		alpha(pal.shadow, 0.55)
	);
	ctx.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
	// Brushed lines.
	ctx.strokeStyle = alpha(pal.steelLight, 0.07);
	ctx.lineWidth = 1;
	for (let y = b.top + 4; y < b.bottom; y += 5) {
		ctx.beginPath();
		ctx.moveTo(b.left, y);
		ctx.lineTo(b.right, y + 1);
		ctx.stroke();
	}
	inside();
	ctx.restore();

	// The cut walls.
	const outline = () => {
		const { left: L, right: R, top: T, bottom: B } = b;
		ctx.beginPath();
		ctx.moveTo(L - wall, T);
		ctx.lineTo(L - wall, B - 18);
		ctx.quadraticCurveTo(L - wall, B + wall, L + 18, B + wall);
		ctx.lineTo(R - 18, B + wall);
		ctx.quadraticCurveTo(R + wall, B + wall, R + wall, B - 18);
		ctx.lineTo(R + wall, T);
		ctx.lineTo(R, T);
		ctx.lineTo(R, B - 18);
		ctx.quadraticCurveTo(R, B, R - 18, B);
		ctx.lineTo(L + 18, B);
		ctx.quadraticCurveTo(L, B, L, B - 18);
		ctx.lineTo(L, T);
		ctx.closePath();
	};
	outline();
	const metal = ctx.createLinearGradient(0, b.top, 0, b.bottom + wall);
	metal.addColorStop(0, pal.steelLight);
	metal.addColorStop(0.55, pal.steel);
	metal.addColorStop(1, pal.steelDark);
	ctx.fillStyle = metal;
	ctx.fill();
	ctx.strokeStyle = alpha(pal.shadow, 0.6);
	ctx.lineWidth = 1.5;
	ctx.stroke();

	// The mouth: back of the rim, then the front.
	ctx.lineWidth = 6;
	ctx.strokeStyle = pal.steelDark;
	ctx.beginPath();
	ctx.ellipse(cx, b.top, halfW + wall / 2, RIM_RY, 0, Math.PI, Math.PI * 2);
	ctx.stroke();
	if (front) front();
	ctx.lineWidth = 6;
	ctx.strokeStyle = pal.steelLight;
	ctx.beginPath();
	ctx.ellipse(cx, b.top, halfW + wall / 2, RIM_RY, 0, 0, Math.PI);
	ctx.stroke();
	ctx.strokeStyle = alpha(pal.fg, 0.6);
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.ellipse(cx, b.top, halfW + wall / 2, RIM_RY, 0, Math.PI * 0.62, Math.PI * 0.8);
	ctx.stroke();
}

/** The liquid surface of a vessel, at `level` 0–1 of its height. */
export function surfaceY(b: Box, level: number): number {
	return b.bottom - Math.max(0, Math.min(1, level)) * (b.bottom - b.top - 8);
}

/** Wort in a cutaway: a body lit at the top, darker towards the bottom, and a lamp-lit line at the surface. */
export function drawWort(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	b: Box,
	surface: number,
	colour: string,
	opacity = 0.92,
	wave?: (x: number) => number
) {
	if (surface >= b.bottom - 1) return;
	const path = () => {
		ctx.beginPath();
		ctx.moveTo(b.left, b.bottom);
		for (let x = b.left; x <= b.right; x += 8) ctx.lineTo(x, surface + (wave ? wave(x) : 0));
		ctx.lineTo(b.right, surface + (wave ? wave(b.right) : 0));
		ctx.lineTo(b.right, b.bottom);
		ctx.closePath();
	};
	const g = ctx.createLinearGradient(0, surface, 0, b.bottom);
	g.addColorStop(0, colour);
	g.addColorStop(1, alpha(pal.shadow, 0.95));
	ctx.globalAlpha = opacity;
	ctx.fillStyle = g;
	path();
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.beginPath();
	for (let x = b.left; x <= b.right; x += 8) {
		const y = surface + (wave ? wave(x) : 0);
		if (x === b.left) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.strokeStyle = alpha(pal.lamp, 0.45);
	ctx.lineWidth = 2.5;
	ctx.stroke();
}

/**
 * The fermenting bucket: thin white food-grade plastic, slightly tapered,
 * with moulded rings, a wire handle and a tap at the foot. `inside` paints
 * what is in it and is drawn behind the plastic, which is translucent, so the
 * level shows through the wall the way it does on a real bucket.
 */
export function drawFermenter(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	b: Box,
	inside?: () => void,
	opts: { sheen?: number; lid?: boolean } = {}
) {
	const cx = (b.left + b.right) / 2;
	const w = b.right - b.left;
	const taper = w * 0.06;
	const shape = () => {
		ctx.beginPath();
		ctx.moveTo(b.left, b.top);
		ctx.lineTo(b.right, b.top);
		ctx.lineTo(b.right - taper, b.bottom - 8);
		ctx.quadraticCurveTo(b.right - taper, b.bottom, b.right - taper - 8, b.bottom);
		ctx.lineTo(b.left + taper + 8, b.bottom);
		ctx.quadraticCurveTo(b.left + taper, b.bottom, b.left + taper, b.bottom - 8);
		ctx.closePath();
	};
	contactShadow(ctx, pal, cx, b.bottom + 1, w * 0.55);

	// The back inside of the bucket, through the mouth and through the wall.
	ctx.save();
	shape();
	ctx.clip();
	ctx.fillStyle = cylinder(
		ctx,
		b.left,
		b.right,
		pal.muted,
		alpha(pal.plastic, 0.75),
		alpha(pal.shadow, 0.5)
	);
	ctx.fillRect(b.left, b.top, w, b.bottom - b.top);
	if (inside) inside();
	ctx.restore();

	// The front wall: translucent white, lit from the lamp side.
	ctx.save();
	shape();
	ctx.clip();
	ctx.globalAlpha = inside ? 0.5 : 0.96;
	ctx.fillStyle = cylinder(ctx, b.left, b.right, pal.fg, pal.plastic, pal.muted);
	ctx.fillRect(b.left, b.top, w, b.bottom - b.top);
	ctx.globalAlpha = 1;
	// Moulded rings.
	ctx.strokeStyle = alpha(pal.shadow, 0.18);
	ctx.lineWidth = 2;
	for (const f of [0.12, 0.2]) {
		ctx.beginPath();
		ctx.moveTo(b.left, b.top + (b.bottom - b.top) * f);
		ctx.lineTo(b.right, b.top + (b.bottom - b.top) * f);
		ctx.stroke();
	}
	// Volume marks down one side.
	ctx.strokeStyle = alpha(pal.ink, 0.35);
	for (let i = 1; i <= 5; i++) {
		const y = b.bottom - (b.bottom - b.top) * (i / 6);
		ctx.beginPath();
		ctx.moveTo(b.left + taper + 12, y);
		ctx.lineTo(b.left + taper + (i % 2 ? 22 : 28), y);
		ctx.stroke();
	}
	if (opts.sheen) drawSheen(ctx, pal, b, opts.sheen);
	ctx.restore();
	ctx.strokeStyle = alpha(pal.shadow, 0.45);
	ctx.lineWidth = 1.5;
	shape();
	ctx.stroke();

	// Rim.
	ctx.fillStyle = pal.fg;
	ctx.beginPath();
	ctx.roundRect(b.left - 4, b.top - 4, w + 8, 9, 4);
	ctx.fill();
	if (!opts.lid) {
		ctx.strokeStyle = alpha(pal.muted, 0.9);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(cx, b.top, w / 2 + 2, 12, 0, Math.PI, Math.PI * 2);
		ctx.stroke();
	}
	// Tap at the foot.
	ctx.fillStyle = pal.plastic;
	ctx.beginPath();
	ctx.roundRect(cx - 10, b.bottom - 34, 20, 16, 4);
	ctx.fill();
	ctx.fillStyle = pal.muted;
	ctx.fillRect(cx - 3, b.bottom - 20, 6, 12);
	// Wire handle, folded down at the side.
	ctx.strokeStyle = pal.steel;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(b.left + 2, b.top + 16);
	ctx.quadraticCurveTo(cx, b.top + 60, b.right - 2, b.top + 16);
	ctx.stroke();
}

/**
 * A wet, sanitised surface: a diagonal glint and a scatter of droplets. Drawn
 * clipped to whatever shape is current.
 */
export function drawSheen(ctx: CanvasRenderingContext2D, pal: Palette, b: Box, strength: number) {
	if (strength <= 0) return;
	const w = b.right - b.left;
	const h = b.bottom - b.top;
	const g = ctx.createLinearGradient(b.left, b.top, b.left + w * 0.6, b.top + h);
	g.addColorStop(0.25, alpha(pal.fg, 0));
	g.addColorStop(0.4, alpha(pal.fg, 0.45 * strength));
	g.addColorStop(0.5, alpha(pal.fg, 0));
	ctx.fillStyle = g;
	ctx.fillRect(b.left, b.top, w, h);
	ctx.fillStyle = alpha(pal.fg, 0.7 * strength);
	for (let i = 0; i < 14; i++) {
		const x = b.left + (((i * 71) % 97) / 97) * w;
		const y = b.top + (((i * 43) % 89) / 89) * h;
		ctx.beginPath();
		ctx.ellipse(x, y, 1.8, 2.6, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}

/** A four-pointed glint, for something that has just come clean. */
export function sparkle(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	x: number,
	y: number,
	r: number,
	a: number
) {
	if (a <= 0.01) return;
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = alpha(pal.fg, a);
	ctx.beginPath();
	ctx.moveTo(x, y - r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.quadraticCurveTo(x, y, x, y + r);
	ctx.quadraticCurveTo(x, y, x - r, y);
	ctx.quadraticCurveTo(x, y, x, y - r);
	ctx.fill();
	ctx.restore();
}
