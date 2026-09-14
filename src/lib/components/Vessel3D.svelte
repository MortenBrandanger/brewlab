<script lang="ts">
	/**
	 * The vessel as a small 3D scene, driven by the simulation.
	 *
	 * This file is also a lesson, because the owner asked for one. Every idea
	 * from real-time graphics that it uses is introduced where it is used:
	 * scene, camera, renderer, geometry, material, light, the render loop,
	 * instancing, disposal. Nothing here is decoration — the liquid level is
	 * the litres, the colour is the SRM, the cloudiness is the haze, the foam
	 * is the head, and how hard it bubbles is how hard the model says the
	 * beer is working. It is the flat SVG vessel's job done with light.
	 *
	 * Three.js is loaded on demand in the browser. It is never part of the
	 * page the server renders, and a device without WebGL gets the flat
	 * vessel instead, so nothing is lost where this cannot run.
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
	 * GEOMETRY is shape without appearance: a list of points and the triangles
	 * between them. Every vessel here is the same shape, a cylinder, with
	 * different proportions — a squat pot, a tall bucket, a glass that widens
	 * at the top. Describing the family by parameters instead of modelling
	 * six objects is what "procedural" means, and it is why AI is good at
	 * this kind of graphics: it is arithmetic, not artwork.
	 */
	const SHAPE: Record<Phase, { top: number; bottom: number; height: number; lid: boolean }> = {
		liquor: { top: 1.0, bottom: 1.0, height: 1.2, lid: false },
		grist: { top: 1.0, bottom: 0.9, height: 1.1, lid: false },
		mash: { top: 1.05, bottom: 1.05, height: 1.3, lid: true },
		kettle: { top: 1.0, bottom: 1.0, height: 1.4, lid: false },
		fermenter: { top: 0.85, bottom: 0.85, height: 1.9, lid: true },
		glass: { top: 0.75, bottom: 0.6, height: 1.8, lid: false }
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
		/*
		 * Three.js is 600 KB of source. Importing it here, at mount, means the
		 * pages that never show a vessel never download it, and the server
		 * never tries to run WebGL code it does not have.
		 */
		Promise.all([
			import('three'),
			import('three/examples/jsm/environments/RoomEnvironment.js')
		]).then(([THREE, { RoomEnvironment }]) => {
			if (disposed) return;
			teardown = build(THREE, RoomEnvironment);
			ready = true;
		});
		return () => {
			disposed = true;
			teardown?.();
		};
	});

	function build(
		THREE: typeof import('three'),
		RoomEnvironment: typeof import('three/examples/jsm/environments/RoomEnvironment.js').RoomEnvironment
	) {
		const mount = host!;
		/*
		 * The three things every 3D program has.
		 *
		 * The SCENE is a tree of everything that exists: meshes, lights, and
		 * groups that hold other things. The CAMERA is a point of view with a
		 * field of view — a wide lens exaggerates depth, a narrow one flattens it;
		 * 32° is a mild portrait lens, which is what a product shot uses. The
		 * RENDERER draws what the camera sees onto a canvas, once per frame.
		 */
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
		// Placed by layout(): the whole vessel in frame, and from higher up when
		// the vessel is opaque, because a pot's contents are only visible from above.

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		// Retina screens have four pixels per CSS pixel; drawing all of them costs
		// four times the work for a gain nobody sees past 2×.
		renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
		mount.appendChild(renderer.domElement);

		/*
		 * LIGHT. Without it a material is a flat colour. One directional light
		 * is the sun through a window; the hemisphere light is the sky above and
		 * the table below, so the underside is not black. One light source only:
		 * two lamps from two sides is the tell of a scene assembled without
		 * looking at it, the same as two drop-shadow directions on a web page.
		 */
		scene.add(new THREE.HemisphereLight(0xfff2dc, 0x3a2a1c, 1.1));
		const sun = new THREE.DirectionalLight(0xffe7c2, 2.6);
		sun.position.set(-2.5, 4, 3);
		scene.add(sun);

		/*
		 * ENVIRONMENT. Lights explain diffuse shading — the soft gradient across
		 * a matte surface — but a shiny surface shows what is *around* it, and
		 * with nothing around it a steel pot renders as a dull brown tube. An
		 * environment map is a picture of a room wrapped around the scene for
		 * materials to reflect; RoomEnvironment is a plain lit studio that Three
		 * ships for exactly this. PMREM pre-blurs it at several roughness levels
		 * so a rough surface reflects a soft version and glass a sharp one.
		 */
		const pmrem = new THREE.PMREMGenerator(renderer);
		scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environmentIntensity = 0.55;
		pmrem.dispose();

		/*
		 * MATERIAL is appearance without shape: how a surface answers light.
		 * MeshPhysicalMaterial is a physically-based model — roughness says
		 * matte or shiny, transmission says how much light passes straight
		 * through, ior is the refractive index (glass is 1.5). These numbers
		 * are measured properties of real materials, which is why a material
		 * described this way looks right under any light.
		 */
		const glassMaterial = new THREE.MeshPhysicalMaterial({
			color: 0xffffff,
			roughness: 0.08,
			metalness: 0,
			transmission: 0.92,
			thickness: 0.15,
			ior: 1.5,
			transparent: true,
			opacity: 0.9
		});
		const steelMaterial = new THREE.MeshStandardMaterial({
			color: 0xcfc3b0,
			roughness: 0.3,
			metalness: 0.9
		});
		const liquidMaterial = new THREE.MeshPhysicalMaterial({
			roughness: 0.15,
			metalness: 0,
			transmission: 0.6,
			thickness: 0.8,
			ior: 1.34,
			transparent: true
		});
		const foamMaterial = new THREE.MeshStandardMaterial({ color: 0xfff6e4, roughness: 0.95 });
		const bubbleMaterial = new THREE.MeshPhysicalMaterial({
			color: 0xffffff,
			roughness: 0.05,
			transmission: 0.8,
			transparent: true,
			opacity: 0.55
		});

		/*
		 * A MESH is geometry plus material: a thing you can see. The scene holds
		 * one of each part and we reshape them as the brew day moves rather than
		 * building six vessels, because creating geometry every frame is the
		 * classic way to make a page stutter and leak memory.
		 */
		// Typed to the general Material so a part can change from glass to steel as the phase moves.
		const vessel: T.Mesh<T.BufferGeometry, T.Material> = new THREE.Mesh(
			new THREE.CylinderGeometry(1, 1, 1, 48, 1, true),
			glassMaterial
		);
		const base: T.Mesh<T.BufferGeometry, T.Material> = new THREE.Mesh(
			new THREE.CylinderGeometry(1, 1, 0.06, 48),
			glassMaterial
		);
		const lid = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 48), steelMaterial);
		const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), liquidMaterial);
		const foam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), foamMaterial);
		scene.add(vessel, base, lid, liquid, foam);

		/*
		 * INSTANCING. Two hundred bubbles as two hundred meshes would be two
		 * hundred draw calls a frame — the GPU is fast at drawing, slow at being
		 * asked. An InstancedMesh draws the same sphere two hundred times in one
		 * call, each with its own position and size, which is how every particle
		 * effect on the web works.
		 */
		const BUBBLES = 160;
		const bubbles = new THREE.InstancedMesh(
			new THREE.SphereGeometry(1, 10, 8),
			bubbleMaterial,
			BUBBLES
		);
		scene.add(bubbles);
		const dummy = new THREE.Object3D();
		// Each bubble: where it is on the way up (0–1), its radius, and where in the pool it sits.
		const life = new Float32Array(BUBBLES);
		const size = new Float32Array(BUBBLES);
		const px = new Float32Array(BUBBLES);
		const pz = new Float32Array(BUBBLES);
		// Deterministic scatter, so the same vessel always looks the same.
		let seed = 7;
		const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
		for (let i = 0; i < BUBBLES; i++) {
			life[i] = rnd();
			size[i] = 0.015 + rnd() * 0.03;
			const a = rnd() * Math.PI * 2;
			const r = Math.sqrt(rnd()) * 0.85;
			px[i] = Math.cos(a) * r;
			pz[i] = Math.sin(a) * r;
		}

		const colour = new THREE.Color();

		/** Reshape the parts to the current state. Called when a prop changes, not every frame. */
		function layout() {
			const s = SHAPE[phase];
			const liquidHeight = Math.max(0.02, s.height * Math.min(1, Math.max(0.05, fill)));

			vessel.scale.set(s.top, s.height, s.top);
			// A glass widens at the top: scale the bottom ring down by moving vertices? Simpler and
			// honest: the geometry is a straight cylinder, and a tapered glass is drawn with a
			// separate geometry when the phase asks for one.
			vessel.geometry.dispose();
			vessel.geometry = new THREE.CylinderGeometry(s.top, s.bottom, 1, 48, 1, true);
			vessel.scale.set(1, s.height, 1);
			vessel.position.y = s.height / 2;

			base.geometry.dispose();
			base.geometry = new THREE.CylinderGeometry(s.bottom, s.bottom, 0.06, 48);
			base.position.y = 0.03;
			base.material = phase === 'glass' ? glassMaterial : steelMaterial;
			vessel.material = phase === 'glass' || phase === 'fermenter' ? glassMaterial : steelMaterial;
			vessel.material.side = THREE.DoubleSide;

			lid.visible = s.lid;
			lid.geometry.dispose();
			lid.geometry = new THREE.CylinderGeometry(s.top * 1.04, s.top * 1.04, 0.08, 48);
			lid.position.y = s.height + 0.04;

			// The liquid follows the vessel's taper: interpolate the radius at its surface.
			const t = liquidHeight / s.height;
			const rTop = (s.bottom + (s.top - s.bottom) * t) * 0.97;
			liquid.geometry.dispose();
			liquid.geometry = new THREE.CylinderGeometry(rTop, s.bottom * 0.97, liquidHeight, 48);
			liquid.position.y = 0.06 + liquidHeight / 2;

			// Colour: water until the grain has been in hot water, then the wort's own SRM.
			if (brewedTo >= 2) {
				const [r, g, b] = srmToRgb(srm);
				colour.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
			} else {
				colour.setRGB(0.62, 0.78, 0.9, THREE.SRGBColorSpace);
			}
			liquidMaterial.color.copy(colour);
			// Haze is light scattered inside the liquid: less passes straight through, and the
			// surface looks softer. Both are what "cloudy" means physically.
			liquidMaterial.transmission = 0.7 * (1 - haze) + 0.05;
			liquidMaterial.roughness = 0.12 + haze * 0.5;
			liquidMaterial.thickness = 0.6 + haze * 1.5;

			// Foam: a head on the finished beer, krausen on a working fermenter, nothing on a pot.
			const foamDepth =
				phase === 'glass' ? 0.05 + head * 0.22 : phase === 'fermenter' ? activity * 0.35 : 0;
			foam.visible = foamDepth > 0.005;
			foam.geometry.dispose();
			foam.geometry = new THREE.CylinderGeometry(
				rTop * 0.99,
				rTop * 0.99,
				Math.max(0.01, foamDepth),
				48
			);
			foam.position.y = 0.06 + liquidHeight + foamDepth / 2;
			foamMaterial.color.set(srm >= 28 ? 0xc9a27a : srm >= 15 ? 0xe9d3b3 : 0xfff6e4);

			// Frame the vessel. Distance from the vertical field of view: a 32° lens
			// sees 2·d·tan(16°) units tall, so d = height / (2·tan(16°)) plus margin.
			const seeThrough = phase === 'glass' || phase === 'fermenter';
			const framed = s.height + (s.lid ? 0.2 : 0) + 0.5;
			const d = framed / (2 * Math.tan((16 * Math.PI) / 180)) + 0.6;
			const elevation = seeThrough ? 0.35 : 0.85;
			camera.position.set(0, s.height * 0.5 + d * elevation * 0.6, d);
			camera.lookAt(0, s.height * 0.45, 0);

			bubbles.count = Math.round(
				BUBBLES * Math.min(1, activity * 1.1 + (phase === 'glass' ? carbonation * 0.35 : 0))
			);
			bubbleField = { liquidHeight, rTop, rBottom: s.bottom * 0.97 };
		}
		let bubbleField = { liquidHeight: 1, rTop: 1, rBottom: 1 };

		/**
		 * THE RENDER LOOP. Nothing on screen moves by itself; the program draws
		 * the scene, then draws it again a sixtieth of a second later with the
		 * bubbles a little higher. requestAnimationFrame asks the browser for the
		 * next frame, and the browser stops asking when the tab is hidden. The
		 * loop only runs while there is something to move: a still vessel is
		 * drawn once and left alone, which is what keeps a phone's battery alive.
		 */
		let raf = 0;
		let last = performance.now();
		function frame(now: number) {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			const { liquidHeight, rTop, rBottom } = bubbleField;
			const speed = 0.25 + activity * 0.9;
			for (let i = 0; i < bubbles.count; i++) {
				life[i] += dt * speed * (0.7 + size[i] * 8);
				if (life[i] > 1) life[i] -= 1;
				const y = 0.08 + life[i] * (liquidHeight - 0.1);
				const r = rBottom + (rTop - rBottom) * life[i];
				dummy.position.set(px[i] * r, y, pz[i] * r);
				const grow = 0.6 + life[i] * 0.6;
				dummy.scale.setScalar(size[i] * grow);
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
		 * buffer it draws into. They must agree or the image stretches. The
		 * observer fires whenever the panel changes width, including on the
		 * first layout, so there is no hard-coded size anywhere.
		 */
		const ro = new ResizeObserver(() => {
			const w = mount.clientWidth || 96;
			const h = mount.clientHeight || 120;
			// The third argument true: the renderer also sets the canvas's CSS size,
			// so the element occupies w×h while drawing w×h×dpr pixels behind it.
			// With false the canvas element was twice the box on a retina screen.
			renderer.setSize(w, h, true);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.render(scene, camera);
		});
		ro.observe(mount);

		const onVisibility = () => kick();
		document.addEventListener('visibilitychange', onVisibility);

		// Props change → reshape once → draw. $effect tracks every prop read inside layout().
		const stop = $effect.root(() => {
			$effect(() => {
				layout();
				renderer.render(scene, camera);
				kick();
			});
		});

		/*
		 * DISPOSAL. The GPU does not garbage-collect. Every geometry and material
		 * holds memory on the graphics card until told to let go, and a component
		 * that mounts and unmounts as the reader moves between screens would leak
		 * a vessel each time without this.
		 */
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			stop();
			for (const m of [vessel, base, lid, liquid, foam]) m.geometry.dispose();
			bubbles.geometry.dispose();
			for (const m of [glassMaterial, steelMaterial, liquidMaterial, foamMaterial, bubbleMaterial])
				m.dispose();
			renderer.dispose();
			renderer.domElement.remove();
		};
	}
</script>

{#if !supported}
	<Vessel {brewedTo} {srm} {haze} {head} {carbonation} />
{:else}
	<div class="relative h-32 w-24" aria-hidden="true">
		<div bind:this={host} class="absolute inset-0 [&>canvas]:block"></div>
		{#if !ready}
			<!-- The flat vessel holds the space until the scene is ready, so nothing jumps. -->
			<div class="absolute inset-0">
				<Vessel {brewedTo} {srm} {haze} {head} {carbonation} />
			</div>
		{/if}
	</div>
{/if}
