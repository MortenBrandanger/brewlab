/**
 * Six tasters, built from primitives.
 *
 * The owner asked, out of curiosity, whether the graphics engine could make
 * the panel's characters. It can make *figures*: a head, shoulders, a hat, a
 * beard, glasses, a hood — spheres, cylinders, cones and tori, in the same
 * three-band toon material and ink line as the vessel. What it cannot make
 * is a face with an expression; that is where procedural figures fall apart
 * and hand drawing begins. So these lean on silhouette and props, which is
 * how board-game pieces and pictograms have always told people apart, and
 * the eyes are two dots.
 *
 * Rendered once, offscreen, into small PNG data URLs and cached. One WebGL
 * context for all six rather than six live canvases — browsers allow about
 * sixteen contexts a page, and a static portrait does not need one each.
 */

import type * as T from 'three';

export type PortraitId =
	'traditionalist' | 'enthusiast' | 'critic' | 'monk' | 'hopster' | 'wild-card';

let cache: Promise<Record<PortraitId, string>> | undefined;

export function portraits(): Promise<Record<PortraitId, string>> {
	cache ??= render();
	return cache;
}

async function render(): Promise<Record<PortraitId, string>> {
	const THREE = await import('three');
	const size = 256;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		alpha: true,
		preserveDrawingBuffer: true
	});
	renderer.setClearColor(0x000000, 0);
	renderer.setSize(size, size, false);

	// The same three bands the vessel uses, so the panel and the pot are one drawing.
	const steps = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
	steps.minFilter = steps.magFilter = THREE.NearestFilter;
	steps.needsUpdate = true;
	const toon = (color: number, extra: Partial<T.MeshToonMaterialParameters> = {}) =>
		new THREE.MeshToonMaterial({ color, gradientMap: steps, ...extra });
	const ink = new THREE.MeshBasicMaterial({ color: 0x17140f, side: THREE.BackSide });

	const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
	camera.position.set(0.9, 1.05, 4.2);
	camera.lookAt(0, 0.35, 0);

	const out = {} as Record<PortraitId, string>;
	for (const id of [
		'traditionalist',
		'enthusiast',
		'critic',
		'monk',
		'hopster',
		'wild-card'
	] as PortraitId[]) {
		const scene = new THREE.Scene();
		scene.add(new THREE.HemisphereLight(0xfff2dc, 0x2a1f16, 0.9));
		const key = new THREE.DirectionalLight(0xffffff, 2.4);
		key.position.set(-3, 4, 4);
		scene.add(key);

		/** Add a mesh and its ink hull in one go. */
		const put = (
			geometry: T.BufferGeometry,
			material: T.Material,
			x: number,
			y: number,
			z: number,
			rot?: [number, number, number],
			scale?: [number, number, number],
			inked = true
		) => {
			const m = new THREE.Mesh(geometry, material);
			m.position.set(x, y, z);
			if (rot) m.rotation.set(...rot);
			if (scale) m.scale.set(...scale);
			scene.add(m);
			if (inked) {
				const h = new THREE.Mesh(geometry, ink);
				h.position.copy(m.position);
				h.rotation.copy(m.rotation);
				h.scale.copy(m.scale).multiplyScalar(1.05);
				scene.add(h);
			}
			return m;
		};
		const eyes = (skin: number, y: number, spread = 0.2, z = 0.56) => {
			const dark = toon(0x17140f);
			put(new THREE.SphereGeometry(0.055, 10, 8), dark, -spread, y, z, undefined, undefined, false);
			put(new THREE.SphereGeometry(0.055, 10, 8), dark, spread, y, z, undefined, undefined, false);
			void skin;
		};
		const bust = (skin: number, coat: number) => {
			put(new THREE.SphereGeometry(0.6, 32, 24), toon(skin), 0, 0.55, 0);
			put(new THREE.CylinderGeometry(0.2, 0.24, 0.35, 16), toon(skin), 0, -0.05, 0);
			put(
				new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
				toon(coat),
				0,
				-0.95,
				0,
				undefined,
				[1.15, 0.9, 0.8]
			);
		};

		switch (id) {
			case 'traditionalist': {
				bust(0xe6b28a, 0x3d5a3a);
				eyes(0, 0.62);
				// A big white beard and a green felt hat with a brim.
				put(
					new THREE.SphereGeometry(0.5, 24, 16),
					toon(0xf1ece0),
					0,
					0.18,
					0.28,
					undefined,
					[1.0, 0.9, 0.7]
				);
				put(new THREE.ConeGeometry(0.5, 0.55, 24), toon(0x2f5b34), 0, 1.25, 0);
				put(new THREE.TorusGeometry(0.62, 0.07, 10, 32), toon(0x2f5b34), 0, 1.0, 0, [
					Math.PI / 2,
					0,
					0
				]);
				put(new THREE.ConeGeometry(0.05, 0.4, 8), toon(0xc9432c), 0.32, 1.2, 0.2, [0, 0, -0.9]);
				break;
			}
			case 'enthusiast': {
				bust(0xf0c9a8, 0x7a2e4a);
				eyes(0, 0.62);
				// Blond hair, a ponytail, and cheeks.
				put(
					new THREE.SphereGeometry(0.64, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
					toon(0xe6c26a),
					0,
					0.6,
					-0.02
				);
				put(
					new THREE.CylinderGeometry(0.12, 0.08, 0.7, 12),
					toon(0xe6c26a),
					-0.35,
					0.35,
					-0.5,
					[0.4, 0, 0.6]
				);
				put(
					new THREE.SphereGeometry(0.09, 10, 8),
					toon(0xe8a1a1),
					-0.3,
					0.45,
					0.5,
					undefined,
					undefined,
					false
				);
				put(
					new THREE.SphereGeometry(0.09, 10, 8),
					toon(0xe8a1a1),
					0.3,
					0.45,
					0.5,
					undefined,
					undefined,
					false
				);
				break;
			}
			case 'critic': {
				bust(0x8fa3c9, 0x4a4f63);
				eyes(0, 0.66, 0.22, 0.55);
				// Round glasses and hair standing on end.
				const frame = toon(0x17140f);
				put(
					new THREE.TorusGeometry(0.14, 0.02, 8, 24),
					frame,
					-0.22,
					0.66,
					0.56,
					undefined,
					undefined,
					false
				);
				put(
					new THREE.TorusGeometry(0.14, 0.02, 8, 24),
					frame,
					0.22,
					0.66,
					0.56,
					undefined,
					undefined,
					false
				);
				for (const [x, r] of [
					[-0.3, 0.5],
					[-0.1, 0.2],
					[0.12, -0.1],
					[0.32, -0.5]
				] as [number, number][]) {
					put(new THREE.ConeGeometry(0.09, 0.45, 8), toon(0x2a2f44), x, 1.2, 0, [0, 0, r]);
				}
				break;
			}
			case 'monk': {
				bust(0xe9b48f, 0x5a3a24);
				eyes(0, 0.6);
				// A hood: a larger sphere shell behind the head, open at the front.
				put(
					new THREE.SphereGeometry(0.78, 32, 24, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.62),
					toon(0x5a3a24, { side: THREE.DoubleSide }),
					0,
					0.62,
					-0.05
				);
				put(new THREE.TorusGeometry(0.55, 0.05, 8, 32), toon(0x8a6a3a), 0, -0.55, 0.05, [
					Math.PI / 2,
					0,
					0
				]);
				break;
			}
			case 'hopster': {
				bust(0xe8b895, 0x8a3b2c);
				eyes(0, 0.64, 0.2, 0.55);
				// Cap with a brim, dark beard, thin rectangular glasses, a hop cone.
				put(
					new THREE.SphereGeometry(0.63, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
					toon(0x2e3d2e),
					0,
					0.62,
					-0.02
				);
				put(new THREE.BoxGeometry(0.7, 0.05, 0.4), toon(0x2e3d2e), 0, 0.72, 0.5);
				put(
					new THREE.SphereGeometry(0.42, 24, 16),
					toon(0x3a2a1c),
					0,
					0.2,
					0.3,
					undefined,
					[1, 0.8, 0.7]
				);
				put(
					new THREE.BoxGeometry(0.62, 0.02, 0.02),
					toon(0x17140f),
					0,
					0.66,
					0.6,
					undefined,
					undefined,
					false
				);
				put(new THREE.ConeGeometry(0.16, 0.36, 10), toon(0x7fa24a), 0.45, 1.15, 0.2, [
					Math.PI,
					0,
					0.3
				]);
				break;
			}
			case 'wild-card': {
				// A dog: brown head, lighter snout, floppy ears, a pink tongue.
				put(new THREE.SphereGeometry(0.58, 32, 24), toon(0x8a5a3a), 0, 0.55, 0);
				put(
					new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
					toon(0x8a5a3a),
					0,
					-0.95,
					0,
					undefined,
					[1.15, 0.9, 0.8]
				);
				put(
					new THREE.SphereGeometry(0.32, 24, 16),
					toon(0xd9b48c),
					0,
					0.38,
					0.5,
					undefined,
					[1, 0.8, 0.9]
				);
				put(
					new THREE.SphereGeometry(0.1, 12, 8),
					toon(0x17140f),
					0,
					0.48,
					0.82,
					undefined,
					undefined,
					false
				);
				put(new THREE.BoxGeometry(0.16, 0.06, 0.3), toon(0xe58a9a), 0.04, 0.16, 0.7, [0.5, 0, 0]);
				put(
					new THREE.SphereGeometry(0.22, 16, 12),
					toon(0x5a3a24),
					-0.6,
					0.55,
					-0.05,
					undefined,
					[0.6, 1.4, 0.8]
				);
				put(
					new THREE.SphereGeometry(0.22, 16, 12),
					toon(0x5a3a24),
					0.6,
					0.55,
					-0.05,
					undefined,
					[0.6, 1.4, 0.8]
				);
				eyes(0, 0.72, 0.24, 0.5);
				break;
			}
		}

		renderer.render(scene, camera);
		out[id] = canvas.toDataURL('image/png');
		scene.traverse((o) => {
			const m = o as T.Mesh;
			if (m.geometry) m.geometry.dispose();
		});
	}
	steps.dispose();
	renderer.dispose();
	return out;
}
