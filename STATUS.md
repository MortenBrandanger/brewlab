# Where this has got to

Updated 2026-09-14. `CLAUDE.md` is how to work here; `STAGES.md` is the
standard the UI is held to. This file is the state of the work.

## Done and stable

**The shape.** Eighteen questions, one decision per screen, grouped into nine
stages that the engine still works in. `src/lib/state/questions.ts` is the
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

**Verification state.** 163 tests green. `svelte-check` 0/0. Contrast audited
live across every reachable question and the full report with every disclosure
open — zero failures.

## Deliberately not done

These were considered and parked on purpose. Do not treat them as oversights.

- **Sanitation as a modelled variable.** Infection risk exists as a signal but
  nothing the reader does feeds it. Wiring it up means a calibrated change, not
  a bolt-on.
- **The mash-temperature miss as a real in-model event.** The variance layer
  perturbs it statistically; the brew day itself never says "you aimed for 66
  and got 64.5, fix it or live with it". That is the most-requested realism
  from the brewer persona and the largest single piece of remaining work.
- **Vorlauf.** Same category.
- **Free backward navigation.** The owner is undecided on whether you should be
  able to jump back anywhere: _"jeg er egentlig usikker på om man skal kunne
  hoppe fritt bakover også. men vi kan diskutere det mer senere."_ Do not
  change this without asking.

## Known gaps

- **`TermWord.svelte` is built and never used.** The Taste report is still a
  wall of roughly forty trade terms with nothing to click. The glossary has 62
  terms and 11 figures ready to wire in.
- **Hop and malt blurbs are written brewer-to-brewer.** "Despite its Fuggle
  parentage", "the classic dank hop", "like Munich turned up". A novice tester
  guessed "noble" meant premium.
- **Risk meters say low/moderate/high with no scale or thresholds.**
- **Smoke has no sensory axis of its own.** It rides the phenol axis, which the
  taster now special-cases by reading the grist. A real `smoke` axis would be
  cleaner but touches sensory, styles and scoring.
- **Layers 1–3 have no dedicated test files.** They are covered indirectly
  through the fifteen canonical recipes in `simulate.test.ts`. A regression in
  the ODE would show up as a calibration failure rather than a named test.

## If you are picking this up cold

1. Read `STAGES.md`, then `CLAUDE.md`.
2. `pnpm install && pnpm dev`, and brew one beer from an empty kettle, reading
   every word.
3. Whatever you change, check it against the stage block in `STAGES.md` rather
   than against the last thing anybody complained about.
