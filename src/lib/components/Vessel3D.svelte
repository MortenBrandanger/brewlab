<script lang="ts">
	/**
	 * The vessel as a small 3D scene, driven by the simulation.
	 *
	 * This file is also a lesson, because the owner asked for one. Every idea
	 * from real-time graphics that it uses is introduced where it is used.
	 * Nothing here is decoration — the liquid level is the litres, the colour
	 * is the SRM, the cloudiness is the haze, the foam is the head, and how hard
	 * it bubbles is how hard the model says the beer is working.
	 *
	 * The first version was "realistic": physically based materials, an
	 * environment map, a plain cylinder. It looked like a paper cup. That is
	 * the most useful lesson in the file: half-realism is a trap. Real objects
	 * have rims, thickness, handles, a shadow where they meet the table, and a
	 * bare cylinder under real light has none of them, so the eye reads it as
	 * cheap. An illustrated app wants an illustrated vessel — flat bands of
	 * colour, an ink line, a soft shadow — which hides what the geometry lacks
	 * and matches the drawings on every other screen. Stylisation is not the
	 * easy way out; it is the way that works within a budget.
	 */
	import { onMount } from 'svelte';
	import type * as T from 'three';
	import Vessel from './Vessel.svelte';
	import { srmToRgb } from '$lib/brewing/appearance';
	import { prefs } from '$lib/state/prefs.svelte';

	let {
		brewedTo,
		srm,
		haze = 0.2,
		head = 0.5,
		carbonation = 0.6,
		/** How hard the contents are working, 0–1: a rolling boil is 1, a finished beer near 0. */
		activity = 0,
		/** How full the vessel is, 0–1. */
		fill = 0.75
	}: {
		brewedTo: number;
		srm: number;
		haze?: number;
		head?: number;
		carbonation?: number;
		activity?: number;
		fill?: number;
	} = $props();

	type Phase = 'liquor' | 'grist' | 'mash' | 'kettle' | 'fermenter' | 'glass';
	const phase = $derived<Phase>(
		brewedTo < 1
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

	/**
	 * GEOMETRY is shape without appearance. Every vessel is a cylinder with
	 * different proportions plus the details that make it read as a thing:
	 * a rolled rim, handles on a pot, a tap on the tun, a lid on the bucket.
	 * The details are what the first version lacked, and they cost a few
	 * lines each — the eye forgives a simple body if the edges are right.
	 */
	const SHAPE: Record<
		Phase,
		{
			top: number;
			bottom: number;
			height: number;
			lid: boolean;
			handles: boolean;
			tap: boolean;
			see: boolean;
		}
	> = {
		liquor: {
			top: 1.0,
			bottom: 1.0,
			height: 1.2,
			lid: false,
			handles: true,
			tap: false,
			see: false
		},
		grist: {
			top: 1.0,
			bottom: 0.9,
			height: 1.1,
			lid: false,
			handles: false,
			tap: false,
			see: false
		},
		mash: {
			top: 1.05,
			bottom: 1.05,
			height: 1.3,
			lid: true,
			handles: false,
			tap: true,
			see: false
		},
		kettle: {
			top: 1.0,
			bottom: 1.0,
			height: 1.4,
			lid: false,
			handles: true,
			tap: false,
			see: false
		},
		fermenter: {
			top: 0.85,
			bottom: 0.85,
			height: 1.9,
			lid: true,
			handles: false,
			tap: true,
			see: true
		},
		glass: {
			top: 0.75,
			bottom: 0.6,
			height: 1.8,
			lid: false,
			handles: false,
			tap: false,
			see: true
		}
	};

	let host = $state<HTMLDivElement>();
	let supported = $state(true);
	let ready = $state(false);

	onMount(() => {
		const probe = document.createElement('canvas');
		if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
			supported = false;
			return;
		}
		let disposed = false;
		let teardown: (() => void) | undefined;
		// Three.js is 600 KB of source, loaded here at mount so pages without a
		// vessel never download it and the server never runs WebGL code.
		import('three').then((THREE) => {
			if (disposed) return;
			teardown = build(THREE);
			ready = true;
		});
		return () => {
			disposed = true;
			teardown?.();
		};
	});

	function build(THREE: typeof import('three')) {
		const mount = host!;

		/*
		 * The three things every 3D program has. The SCENE is a tree of
		 * everything that exists. The CAMERA is a point of view with a field of
		 * view — 30° is a mild portrait lens, what a product shot uses. The
		 * RENDERER draws what the camera sees onto a canvas, once per frame.
		 */
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
		mount.appendChild(renderer.domElement);

		/*
		 * LIGHT. A toon material quantises the light it receives into bands, so
		 * the key light's direction decides where the bands fall — from the
		 * upper left, like every illustration in the app. The hemisphere light
		 * keeps the dark band from going black.
		 */
		scene.add(new THREE.HemisphereLight(0xfff2dc, 0x2a1f16, 0.9));
		const key = new THREE.DirectionalLight(0xffffff, 2.4);
		key.position.set(-3, 4, 4);
		scene.add(key);

		/*
		 * MATERIAL, stylised. MeshToonMaterial shades in steps instead of a
		 * smooth gradient — the look of a screen print or a cel animation. The
		 * steps come from a tiny one-row texture: three greys, sampled with
		 * NearestFilter so they stay as steps instead of blurring back into a
		 * gradient. Three bands is the illustrator's classic: shadow, mid, light.
		 */
		const steps = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
		steps.minFilter = THREE.NearestFilter;
		steps.magFilter = THREE.NearestFilter;
		steps.needsUpdate = true;

		/*
		 * Copper, not steel. The flat drawings on every other screen are copper
		 * and amber, and a khaki cylinder next to them read as cardboard. A
		 * palette is a decision made once; a second one is a mistake.
		 */
		const steelMaterial = new THREE.MeshToonMaterial({ color: 0x9c6a44, gradientMap: steps });
		const copperMaterial = new THREE.MeshToonMaterial({ color: 0x6b3f22, gradientMap: steps });
		const glassMaterial = new THREE.MeshToonMaterial({
			color: 0xdfe9ee,
			gradientMap: steps,
			transparent: true,
			opacity: 0.28,
			side: THREE.DoubleSide
		});
		const liquidMaterial = new THREE.MeshToonMaterial({ gradientMap: steps, transparent: true });
		const foamMaterial = new THREE.MeshToonMaterial({ color: 0xfff6e4, gradientMap: steps });
		const bubbleMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.55
		});
		/*
		 * THE INK LINE. An illustration has an outline; a mesh does not. The
		 * classic trick is the inverted hull: draw the same shape again, a
		 * little larger, in the line colour, showing only its back faces — so
		 * the front of the real mesh covers the hull everywhere except a thin
		 * rim around the silhouette. One extra draw, no shader, and the vessel
		 * suddenly belongs on the same page as the drawings.
		 */
		const inkMaterial = new THREE.MeshBasicMaterial({ color: 0x17140f, side: THREE.BackSide });
		const shadowMaterial = new THREE.MeshBasicMaterial({
			color: 0x000000,
			transparent: true,
			opacity: 0.38
		});

		/*
		 * A MESH is geometry plus material. The scene holds one of each part and
		 * reshapes it when the brew day moves, because creating geometry every
		 * frame is the classic way to make a page stutter and leak.
		 */
		const mesh = (geometry: T.BufferGeometry, material: T.Material) =>
			new THREE.Mesh(geometry, material) as T.Mesh<T.BufferGeometry, T.Material>;
		const body = mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), steelMaterial);
		const bodyInk = mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), inkMaterial);
		const base = mesh(new THREE.CylinderGeometry(1, 1, 0.08, 48), steelMaterial);
		const rim = mesh(new THREE.TorusGeometry(1, 0.05, 10, 48), steelMaterial);
		const rimInk = mesh(new THREE.TorusGeometry(1, 0.05, 10, 48), inkMaterial);
		const lid = mesh(new THREE.CylinderGeometry(1, 1, 0.1, 48), steelMaterial);
		const lidInk = mesh(new THREE.CylinderGeometry(1, 1, 0.1, 48), inkMaterial);
		const knob = mesh(new THREE.SphereGeometry(0.1, 16, 12), copperMaterial);
		const handleL = mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 24, Math.PI), copperMaterial);
		const handleR = mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 24, Math.PI), copperMaterial);
		const tap = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12), copperMaterial);
		const liquid = mesh(new THREE.CylinderGeometry(1, 1, 1, 48), liquidMaterial);
		const surface = mesh(new THREE.CircleGeometry(1, 48), liquidMaterial);
		const foam = mesh(new THREE.CylinderGeometry(1, 1, 1, 48), foamMaterial);
		const foamInk = mesh(new THREE.CylinderGeometry(1, 1, 1, 48), inkMaterial);
		/*
		 * CONTACT SHADOW. The single cheapest thing that stops an object
		 * floating: a soft dark ellipse where it meets the table. Real shadow
		 * maps cost a second render of the scene; this costs one flat disc.
		 */
		const shadow = mesh(new THREE.CircleGeometry(1, 48), shadowMaterial);
		shadow.rotation.x = -Math.PI / 2;
		scene.add(
			shadow,
			body,
			bodyInk,
			base,
			rim,
			rimInk,
			lid,
			lidInk,
			knob,
			handleL,
			handleR,
			tap,
			liquid,
			surface,
			foam,
			foamInk
		);

		/*
		 * INSTANCING. Two hundred bubbles as two hundred meshes is two hundred
		 * draw calls a frame; an InstancedMesh draws one sphere two hundred
		 * times in one call, each with its own position and size.
		 */
		const BUBBLES = 140;
		const bubbles = new THREE.InstancedMesh(
			new THREE.SphereGeometry(1, 8, 6),
			bubbleMaterial,
			BUBBLES
		);
		scene.add(bubbles);
		const dummy = new THREE.Object3D();
		const life = new Float32Array(BUBBLES);
		const size = new Float32Array(BUBBLES);
		const px = new Float32Array(BUBBLES);
		const pz = new Float32Array(BUBBLES);
		let seed = 7;
		const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
		for (let i = 0; i < BUBBLES; i++) {
			life[i] = rnd();
			size[i] = 0.014 + rnd() * 0.028;
			const a = rnd() * Math.PI * 2;
			const r = Math.sqrt(rnd()) * 0.85;
			px[i] = Math.cos(a) * r;
			pz[i] = Math.sin(a) * r;
		}

		const colour = new THREE.Color();
		const INK = 1.035;
		const swap = (m: T.Mesh<T.BufferGeometry, T.Material>, g: T.BufferGeometry) => {
			m.geometry.dispose();
			m.geometry = g;
		};

		let field = { liquidHeight: 1, rTop: 1, rBottom: 1 };

		/** Reshape the parts to the current state. Called when a prop changes, not every frame. */
		function layout() {
			const s = SHAPE[phase];
			const h = s.height;
			const liquidHeight = Math.max(0.02, h * Math.min(1, Math.max(0.05, fill)));

			const wall = s.see ? glassMaterial : steelMaterial;
			body.material = wall;
			swap(body, new THREE.CylinderGeometry(s.top, s.bottom, h, 48, 1, true));
			body.position.y = h / 2;
			swap(bodyInk, new THREE.CylinderGeometry(s.top * INK, s.bottom * INK, h * 1.01, 48, 1, true));
			bodyInk.position.y = h / 2;
			bodyInk.visible = !s.see;

			base.material = wall;
			swap(base, new THREE.CylinderGeometry(s.bottom, s.bottom * 0.96, 0.08, 48));
			base.position.y = 0.04;

			// A rolled rim on an open pot or a glass; the lid's own edge on a closed one.
			rim.visible = rimInk.visible = !s.lid;
			rim.material = s.see ? glassMaterial : steelMaterial;
			swap(rim, new THREE.TorusGeometry(s.top, s.see ? 0.03 : 0.05, 10, 48));
			swap(rimInk, new THREE.TorusGeometry(s.top, (s.see ? 0.03 : 0.05) * 1.6, 10, 48));
			rim.rotation.x = rimInk.rotation.x = Math.PI / 2;
			rim.position.y = rimInk.position.y = h;

			lid.visible = lidInk.visible = knob.visible = s.lid;
			swap(lid, new THREE.CylinderGeometry(s.top * 1.05, s.top * 1.05, 0.1, 48));
			swap(
				lidInk,
				new THREE.CylinderGeometry(s.top * 1.05 * INK, s.top * 1.05 * INK, 0.1 * 1.4, 48)
			);
			lid.position.y = lidInk.position.y = h + 0.05;
			knob.position.y = h + 0.18;

			handleL.visible = handleR.visible = s.handles;
			handleL.position.set(-s.top - 0.02, h * 0.62, 0);
			handleR.position.set(s.top + 0.02, h * 0.62, 0);
			// The torus lies in the XY plane with its arc pointing +Y; turned a
			// quarter about Z the arc points sideways, out from the pot.
			handleL.rotation.set(0, 0, Math.PI / 2);
			handleR.rotation.set(0, 0, -Math.PI / 2);

			tap.visible = s.tap;
			tap.rotation.x = Math.PI / 2;
			tap.position.set(0, 0.22, s.bottom + 0.12);

			// The liquid follows the vessel's taper: interpolate the radius at its surface.
			const t = liquidHeight / h;
			const rTop = (s.bottom + (s.top - s.bottom) * t) * 0.965;
			const rBottom = s.bottom * 0.94;
			swap(liquid, new THREE.CylinderGeometry(rTop, rBottom, liquidHeight, 48, 1, true));
			liquid.position.y = 0.08 + liquidHeight / 2;
			liquid.visible = s.see;
			swap(surface, new THREE.CircleGeometry(rTop, 48));
			surface.rotation.x = -Math.PI / 2;
			surface.position.y = 0.08 + liquidHeight + 0.001;

			// Colour: water until the grain has been in hot water, then the wort's own SRM.
			if (brewedTo >= 2) {
				const [r, g, b] = srmToRgb(srm);
				colour.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
			} else {
				colour.setRGB(0.55, 0.72, 0.86, THREE.SRGBColorSpace);
			}
			liquidMaterial.color.copy(colour);
			// Haze in a flat style is simply how solid the liquid looks: clear beer lets the
			// far wall show through, hazy beer does not.
			liquidMaterial.opacity = 0.72 + haze * 0.28;

			// Foam: a head on the finished beer, krausen on a working fermenter, nothing on a pot.
			const foamDepth =
				phase === 'glass' ? 0.06 + head * 0.22 : phase === 'fermenter' ? activity * 0.32 : 0;
			foam.visible = foamInk.visible = foamDepth > 0.005;
			swap(foam, new THREE.CylinderGeometry(rTop * 1.0, rTop * 1.0, Math.max(0.01, foamDepth), 48));
			swap(
				foamInk,
				new THREE.CylinderGeometry(rTop * INK, rTop * INK, Math.max(0.01, foamDepth) * 1.1, 48)
			);
			foam.position.y = foamInk.position.y = 0.08 + liquidHeight + foamDepth / 2;
			foamMaterial.color.set(srm >= 28 ? 0xc9a27a : srm >= 15 ? 0xe9d3b3 : 0xfff6e4);

			swap(shadow, new THREE.CircleGeometry(s.bottom * 1.25, 48));
			shadow.scale.set(1, 0.55, 1);
			shadow.position.set(0.12, 0.002, 0.1);

			/*
			 * COMPOSITION. Straight on and level is how a catalogue shoots a
			 * paper cup. Three-quarters from slightly above is how an illustrator
			 * draws a pot: you see the rim as an ellipse, one handle in front of
			 * the other, and the liquid surface. Distance from the field of view
			 * so the whole vessel fits with a margin.
			 */
			frameCamera();

			bubbles.count = Math.round(
				BUBBLES * Math.min(1, activity * 1.1 + (phase === 'glass' ? carbonation * 0.35 : 0))
			);
			field = { liquidHeight, rTop, rBottom };
		}

		/**
		 * Distance from what has to fit. A pot is wider than it is tall, and a
		 * canvas taller than it is wide sees less sideways than up — the first
		 * version framed by height alone and cropped every pot at the handles.
		 */
		function frameCamera() {
			const s = SHAPE[phase];
			const h = s.height + (s.lid ? 0.3 : 0.15);
			const w = Math.max(s.top, s.bottom) * 2 * 1.1 + (s.handles ? 0.7 : 0.2);
			const tanHalf = Math.tan((15 * Math.PI) / 180);
			const dh = h / (2 * tanHalf);
			const dw = w / (2 * tanHalf * Math.max(0.4, camera.aspect));
			const d = Math.max(dh, dw) * 1.02 + 0.15;
			camera.position.set(d * 0.4, s.height * 0.5 + d * 0.36, d * 0.9);
			camera.lookAt(0, s.height * 0.42, 0);
		}

		/*
		 * THE RENDER LOOP. Nothing moves by itself: the scene is drawn, then
		 * drawn again a sixtieth of a second later with the bubbles a little
		 * higher. requestAnimationFrame asks the browser for the next frame and
		 * the browser stops asking when the tab is hidden. The loop only runs
		 * while something moves; a still pot is drawn once and left alone.
		 */
		let raf = 0;
		let last = performance.now();
		function frame(now: number) {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			const { liquidHeight, rTop, rBottom } = field;
			const speed = 0.25 + activity * 0.9;
			for (let i = 0; i < bubbles.count; i++) {
				life[i] += dt * speed * (0.7 + size[i] * 8);
				if (life[i] > 1) life[i] -= 1;
				const y = 0.1 + life[i] * (liquidHeight - 0.12);
				const r = rBottom + (rTop - rBottom) * life[i];
				dummy.position.set(px[i] * r, y, pz[i] * r);
				dummy.scale.setScalar(size[i] * (0.6 + life[i] * 0.6));
				dummy.updateMatrix();
				bubbles.setMatrixAt(i, dummy.matrix);
			}
			bubbles.instanceMatrix.needsUpdate = true;
			renderer.render(scene, camera);
			if (moving()) raf = requestAnimationFrame(frame);
			else raf = 0;
		}
		const moving = () => prefs.animate && bubbles.count > 0 && !document.hidden;
		function kick() {
			if (!raf) {
				last = performance.now();
				raf = requestAnimationFrame(frame);
			}
		}

		/*
		 * RESIZE. A canvas has two sizes: the CSS box it occupies and the pixel
		 * buffer it draws into. setSize with `true` keeps them in step, so the
		 * element occupies w×h while drawing w×h×dpr pixels behind it.
		 */
		const ro = new ResizeObserver(() => {
			const w = mount.clientWidth || 96;
			const h = mount.clientHeight || 128;
			renderer.setSize(w, h, true);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			frameCamera();
			renderer.render(scene, camera);
		});
		ro.observe(mount);
		const onVisibility = () => kick();
		document.addEventListener('visibilitychange', onVisibility);

		const stop = $effect.root(() => {
			$effect(() => {
				layout();
				renderer.render(scene, camera);
				kick();
			});
		});

		/*
		 * DISPOSAL. The GPU does not garbage-collect. Every geometry and material
		 * holds memory on the graphics card until told to let go.
		 */
		const parts = [
			body,
			bodyInk,
			base,
			rim,
			rimInk,
			lid,
			lidInk,
			knob,
			handleL,
			handleR,
			tap,
			liquid,
			surface,
			foam,
			foamInk,
			shadow
		];
		const materials = [
			steelMaterial,
			copperMaterial,
			glassMaterial,
			liquidMaterial,
			foamMaterial,
			bubbleMaterial,
			inkMaterial,
			shadowMaterial
		];
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			stop();
			for (const m of parts) m.geometry.dispose();
			bubbles.geometry.dispose();
			for (const m of materials) m.dispose();
			steps.dispose();
			renderer.dispose();
			renderer.domElement.remove();
		};
	}
</script>

{#if !supported}
	<Vessel {brewedTo} {srm} {haze} {head} {carbonation} />
{:else}
	<!-- Wider than the flat drawing's box: a pot is wider than it is tall. -->
	<div class="relative h-32 w-32" aria-hidden="true">
		<div bind:this={host} class="absolute inset-0 [&>canvas]:block"></div>
		{#if !ready}
			<div class="absolute inset-0">
				<Vessel {brewedTo} {srm} {haze} {head} {carbonation} />
			</div>
		{/if}
	</div>
{/if}
