# Where this has got to

Updated 2026-09-14, evening. `CLAUDE.md` is how to work here; `STAGES.md` is the
standard the UI is held to. This file is the state of the work.

## Done and stable

**The shape.** Twenty-three questions, one decision per screen, grouped into nine
stages that the engine still works in. Batch size opens the day; the
fermentation is four acts (which yeast, how much, how warm, how long). `src/lib/state/questions.ts` is the
spine: each question carries its `ask` and a `hint` that says what you are
physically doing, and the eighteen hints read in order as one brew day.

**The reveal rule.** `brewedTo` gates what the app will claim. No gravity
before the mash, no alcohol before fermentation, no judgement before the glass
is poured. `src/lib/state/stages.ts` owns the mapping.

**Three modelling layers, each calibrated before it was wired in:**

| Layer | File                      | What it does                                                                                                                                                                                                    |
| ----- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `mashKinetics.ts`         | Alpha/beta amylase activity and first-order denaturation integrated over the rest, producing a real sugar spectrum (glucose, maltose, maltotriose, dextrins) rather than an attenuation lookup                  |
| 2     | `fermentationKinetics.ts` | Sterol-limited growth budget, Monod uptake, catabolite repression, per-strain maltotriose ceiling, flocculation, diacetyl produced during growth and reabsorbed, ethanol inhibition, extracellular glucoamylase |
| 3     | `variance.ts`             | 240 seeded runs over realistic execution error, reporting the spread and decomposing it per source by Pearson correlation                                                                                       |

Mash calibration targets, all hit: 63 °C/75 min → 86.7%, 66/60 → 83.1%,
70/60 → 70.5%, 72/60 → 65.9%.

**Three things built on top of those:**

- `forecast.ts` — the right panel says where the beer is heading as a range
  that narrows. Appears once a grist exists, moves with the mash choice,
  collapses to a figure when a yeast is picked, disappears once poured.
- `taster.ts` — a first-person tasting note on the report: pour, nose, first
  sip, middle, finish, and an opinion that may disagree with the score. No
  language model; every clause is a threshold on a modelled quantity.
- `rigs.ts` — the run-off screen asks what you are brewing on and derives
  brewhouse efficiency and collection volume from the answer.

**Target-awareness.** `target.ts` compares the projected beer with the chosen
style from the first grain onward, and the style panel, the watch list, the
kettle readout and the report all say the miss in a brewer's words. The report
opens with "you aimed at X and missed on…". Scoring can no longer call an
87-IBU porter coherent (BU:GU now enters coherence) and a severe fault caps
both enjoyment and the headline.

**The mash misses, and you decide.** `mashLanding.ts` rolls where the mash
actually landed — seeded from the recipe, so deterministic, one standard
deviation of 1.1 °C — and the mash stage's second question asks what to do:
top it up (restores the aim, thins the mash, both written into the recipe)
or live with it (`landedTempC`, and the first rest runs there). The stage will
not close the lid until the thermometer has been read. The brewer persona's
number-one request, and the variance panel's "hitting the mash temperature"
is now something you experience rather than read.

**Sanitation is modelled.** The chill stage opens with "how clean is everything
the beer will touch": rinse, boiling water, no-rinse sanitiser (default) or
bleach. A rinse adds 4.5 to the contamination risk; bleach adds a
chlorophenol risk with its own fault and taster line. Each card shows its risk
from a run of the model. `chill.sanitation` is optional on the recipe and read
as the default when absent, so saved recipes round-trip unchanged.

**The brew day plays back.** `playback.ts` exposes the frames the model already
computed — the mash minute by minute, the boil as bitterness accumulates and
water leaves, the fermentation day by day — and the panel plays them for a
few seconds when a stage is carried out. Not an animation drawn to look like
brewing: a playback of the simulation that ran. Skippable by click, silent
when motion is off, and only on the first pass through a stage.

**The words are for a person who has never brewed.** All 76 ingredient blurbs
say what the thing does to the beer and what you would use it for, in plain
words, and the hop picker explains alpha once above the list. `Glossed.svelte`
scans report prose for the 62 glossary words and hands each to `TermWord`,
which opens a definition under the word without breaking the sentence.
Glossing stays out of picker buttons — a word inside a button is a click on
the button.

**The variance runs in a worker.** 240 simulations took ~190 ms on a desktop
and would take the best part of a second on a phone, on the main thread, on
every control move on the report. `variance.worker.ts` runs the same pure
function off-thread; `state/variance.svelte.ts` drops stale replies and falls
back to inline where workers do not exist. Measured before: `simulate` 1.7 ms,
`forecast` without a yeast 12 ms, `analyseVariance(240)` 194 ms.

**Vorlauf is a step.** The sparge stage opens with the cloudy first jug: pour
it back (default) or straight to the kettle, which adds haze the cold crash
cannot remove and a tannin grip. The last of the deliberately parked items.

**Flows checked:** save, duplicate, delete (now with undo rather than a
confirm), print sheet (plain labels, and it lists the rig, the sanitation, the
mash landing and a skipped vorlauf), keyboard focus rings on cards and
headings, and a programmatic pass (every button named, every input labelled,
skip link, lang, landmarks).

**A tasting panel.** `panel.ts` gives six tasters — the Traditionalist, the
Enthusiast, the Critic, the Monk, the Hopster, the Wild Card — each a
weighting of the sensory vector, the faults and the style match, with a line
chosen from what moved them most and hearts from their score. Their
disagreement is the point: "The Hopster loved it; The Traditionalist did
not. That gap is the beer." Portraits: a PNG in `static/panel/` wins;
otherwise `portraits.ts` builds each taster from primitives — head,
shoulders, hat, beard, glasses, hood, a dog — in the vessel's toon style,
rendered once offscreen into data URLs. Silhouette and props, two dots for
eyes; expressions are where procedural figures stop and hand drawing starts. The full tasting note is now "What the Critic wrote down".

**The vessel in 3D — illustrated, not "realistic".** `Vessel3D.svelte` renders
the panel's vessel as a small Three.js scene driven by the simulation — liquid
level, SRM colour, haze as how solid the liquid looks, head as a foam disc,
bubbles as an instanced particle set proportional to how hard the model says
the beer is working. Toon-shaded in three bands with an inverted-hull ink
line, the app's copper palette, a contact shadow, and the details that make a
pot a pot (rim, handles, tap, lid). The first version was physically based
and looked like a paper cup; `GRAPHICS.md` explains why that is the most
useful lesson in the file.
Loaded on demand (737 KB chunk, ≈180 KB gzipped), falls back to the flat
vessel without WebGL, stops rendering when nothing moves, and can be switched
off with the header's "Flat vessel" toggle. `GRAPHICS.md` explains every
concept it uses; the owner asked for the lesson as much as the vessel.

**Verification state.** 205 tests green. `svelte-check` 0/0. Contrast audited
live across every reachable question and the full report with every disclosure
open — zero failures.

## Deliberately not done

These were considered and parked on purpose. Do not treat them as oversights.

- **Free backward navigation.** The owner is undecided on whether you should be
  able to jump back anywhere: _"jeg er egentlig usikker på om man skal kunne
  hoppe fritt bakover også. men vi kan diskutere det mer senere."_ Do not
  change this without asking.

## Known gaps

- **Smoke has no sensory axis of its own.** It rides the phenol axis, which the
  taster now special-cases by reading the grist. A real `smoke` axis would be
  cleaner but touches sensory, styles and scoring.

## If you are picking this up cold

1. Read `STAGES.md`, then `CLAUDE.md`.
2. `pnpm install && pnpm dev`, and brew one beer from an empty kettle, reading
   every word.
3. Whatever you change, check it against the stage block in `STAGES.md` rather
   than against the last thing anybody complained about.
