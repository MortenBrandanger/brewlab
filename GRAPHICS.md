# Graphics in BrewLab, and what each idea means

Written because the owner asked to learn, not only to have. Every concept
here is used in `src/lib/components/Vessel3D.svelte`, and the comment above
the code that uses it says the same thing in fewer words.

## Why everything here is code

There are two ways to put a picture on a screen: draw it, or describe it.
A drawn picture — a PNG, a sprite sheet, a 3D model made in Blender — is
pixels or vertices somebody placed by hand. A described picture is a program
that places them. BrewLab has no drawn pictures at all. The vessels are SVG
paths, the curves are paths computed from data, and the 3D vessel is a
cylinder whose radius, height, colour, cloudiness and bubbling are numbers
the simulation produced.

That is not an aesthetic choice; it is what makes the graphics _true_. The
liquid is the colour of the SRM the model computed. The foam is the head the
appearance model predicted. The bubbles are proportional to how hard the
fermentation is running in the kinetics curve. A bubbling GIF would teach
nothing because it would bubble the same for every beer.

It is also why an AI can build it. Code-described graphics are text, and
text is what the model is good at. Hand-drawn art is not, and a project that
needs a hundred consistent sprites should plan for a human artist or an
image model with a very tight brief — not for the coding assistant.

## The ladder, lightest to heaviest

| Layer               | In BrewLab                                     | When to reach for it                                     |
| ------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| SVG + CSS           | `Vessel.svelte`, `BreweryScene.svelte`, curves | Illustration, icons, charts, simple motion. Default.     |
| Canvas 2D           | (not yet)                                      | Thousands of particles, painterly effects, no depth.     |
| WebGL via Three.js  | `Vessel3D.svelte`                              | Real light, transparency, refraction, depth.             |
| Game engine (Godot) | (no)                                           | An actual game: physics, scenes, input, sound. 20–40 MB. |

The rule: go one rung up only when the rung below cannot say what the model
knows. The flat vessel could not show cloudiness as light scattering inside
a liquid, or a head as a thing with thickness. The 3D one can. Nothing in the
app needs a game engine, and its cost — download size, battery, no
accessibility tree, a second source of truth to keep in step — is real.

## The lesson the first version taught

The first 3D vessel was "realistic": physically based materials, an
environment map to reflect, a plain cylinder. It rendered correctly and it
looked like a paper cup. The owner said so, and he was right.

Half-realism is a trap. Real objects have a rolled rim, wall thickness,
handles, a weld line, a shadow where they meet the table, scratches, and a
hundred other things the eye checks without knowing it checks them. A bare
cylinder under real light fails every check at once, and the more real the
lighting, the more obviously it fails. Getting a photoreal pot right is
weeks of work by someone who does that for a living.

An illustration makes no such promise. Three flat bands of colour
(`MeshToonMaterial` with a three-step gradient map), an ink line drawn with
the inverted-hull trick, a copper palette shared with the flat drawings on
every other screen, a soft dark ellipse for a contact shadow, and the few
details that make a pot a pot — rim, handles, a tap on the tun, a lid with a
knob. It matches the app, it hides what the geometry lacks, and it took a
tenth of the effort the "realistic" version would have needed to stop
looking cheap. **Stylisation is not the easy way out; it is the way that
works within a budget**, and it is the single most useful thing to know
before asking an AI for graphics.

Two smaller lessons from the same afternoon: frame by _width_ as well as
height (a pot is wider than it is tall, and a tall canvas sees less
sideways), and shoot from three-quarters above, the way an illustrator
draws a pot — straight-on and level is how a catalogue shoots a cup.

## The vocabulary, as used

**Scene.** A tree of everything that exists: meshes, lights, groups. Adding
to the scene is the only way to make a thing visible.

**Camera.** A point of view with a _field of view_. A wide lens exaggerates
depth like a phone held close; a narrow one flattens like a telephoto. The
vessel uses 32°, a mild portrait lens — what a product photograph uses. The
distance is computed from the height so the whole vessel fits: a lens that
sees θ degrees vertically sees `2·d·tan(θ/2)` units tall at distance `d`.

**Renderer.** Draws what the camera sees onto a canvas. A canvas has two
sizes — the CSS box and the pixel buffer — and they must agree or the image
stretches; on a retina screen the buffer is 2× the box. The first version of
the vessel drew a 192-pixel canvas into a 96-pixel box because of this.

**Geometry.** Shape without appearance: points and the triangles between
them. Every vessel is a cylinder with different proportions — _parametric_
geometry, one shape family instead of six models. Geometry lives on the GPU
and must be disposed of by hand; the GPU has no garbage collector.

**Material.** Appearance without shape: how a surface answers light.
`MeshPhysicalMaterial` is a physically-based model — _roughness_ (matte to
mirror), _metalness_, _transmission_ (how much light passes straight
through), _ior_ (refractive index; glass is 1.5, beer about 1.34),
_thickness_ (how far light travels inside before it exits). These are
measured properties of real materials, which is why a material described
this way looks right under any light, and why haze can be expressed
honestly: less transmission, more roughness, more thickness.

**Mesh.** Geometry plus material: a visible thing. The scene keeps one of
each part and reshapes it when a prop changes, because creating geometry
every frame is the classic way to make a page stutter and leak.

**Light.** Without it a material is a flat colour. One directional light is
the sun through a window; a hemisphere light is sky above and table below so
the underside is not black. One light source — two lamps from two sides is
the tell of a scene assembled without looking at it, the same as two
drop-shadow directions on a web page.

**Environment map.** Lights explain diffuse shading, the soft gradient across
a matte surface. A shiny surface shows what is _around_ it, and with nothing
around it a steel pot renders as a dull brown tube — which is exactly what
the first version did. An environment map is a picture of a room wrapped
around the scene for materials to reflect. `RoomEnvironment` is a plain lit
studio Three ships for this; PMREM pre-blurs it at several roughness levels
so rough surfaces reflect a soft version and glass a sharp one.

**Instancing.** Two hundred bubbles as two hundred meshes is two hundred draw
calls a frame. The GPU is fast at drawing and slow at being asked; an
`InstancedMesh` draws one sphere two hundred times in one call, each with its
own position and scale. Every particle effect on the web works this way.

**The render loop.** Nothing moves by itself. The program draws the scene,
then draws it again a sixtieth of a second later with the bubbles a little
higher. `requestAnimationFrame` asks the browser for the next frame and the
browser stops asking when the tab is hidden. The vessel only loops while
something moves: a still pot is drawn once, which is what keeps a phone's
battery alive. `prefers-reduced-motion` and the app's own motion toggle stop
the loop entirely.

**Disposal.** Geometry, materials, textures and the renderer itself hold GPU
memory until told to let go. A component that mounts and unmounts as the
reader moves between screens leaks a vessel each time without it.

**Colour management.** The model's SRM colour is an sRGB value, the colour
space every screen and CSS uses. The renderer works in linear light, where
doubling a number doubles the photons; `setRGB(r, g, b, SRGBColorSpace)`
converts on the way in, and the output is converted back. Skip either and
every colour is wrong in a way that is hard to name.

## How to verify graphics you cannot see

The assistant sees screenshots, not motion. What worked here: zoom the panel
region, take three frames seconds apart, and compare — that is how the
frozen-playback bug and the double-size canvas were found. A GIF recording
is better when motion itself is the question. Never trust "it compiles".

## Figures from primitives

The tasting panel's portraits are built the same way as the vessel
(`src/lib/components/portraits.ts`): a sphere for a head, a half-sphere for
shoulders, a cone and a torus for a hat, a squashed sphere for a beard, two
tori for glasses, a shell for a hood, two flattened spheres for a dog's
ears. Same three-band toon material, same ink hull, rendered once into a
256-pixel PNG each through one shared offscreen WebGL context and cached.

They work because they stop before the face. Silhouette and props are how
pictograms and board-game pieces have always told people apart, and a
procedural figure can do those well; an expression — a smile that reads as
warm rather than unsettling — is where it falls apart and a hand takes
over. So the eyes are two dots, the mouth is absent, and the character is
carried by a hat, a beard, a hood, a cap, a snout. A real portrait dropped
into `static/panel/` replaces the figure without a line of code.

## Where this could go

The same data could drive more than it does: krausen that rises and falls
with `suspended` in the fermentation curve rather than a fixed band; the
boil as a churning surface, with steam as a second instanced particle set;
the mash tun's grain bed; a glass poured live from the playback frames.
Each is a few dozen lines on top of what exists, and each stays honest
because every number comes from the model.
