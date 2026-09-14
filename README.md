# BrewLab

**[brewexplained.com](https://brewexplained.com)**

A beer-brewing simulator that runs entirely in the browser. You build a recipe from water
to glass and the model tells you what it will taste like — and, more importantly, exactly
why.

```
Water → Grain → Mash → Sparge → Boil & hops → Chill → Ferment → Condition → Taste
```

No account, no server, no database. Recipes live in IndexedDB in your own browser, and a
shared link carries the whole recipe inside the URL fragment, which browsers never send
anywhere.

## Running it

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 197 tests
pnpm check      # svelte-check
pnpm lint
pnpm build      # static site in build/
```

Node 22+ and pnpm 10.

## The brew day

Eighteen questions, one decision per screen, grouped into the nine stages the
engine works in. Each question says what you are physically doing at that
moment, and read in order they are one continuous brew day rather than
eighteen explanations of eighteen controls.

The simulator tracks two separate things. The recipe is what the beer _would_ be, and it
recalculates the instant any control moves. `brewedTo` is how far the brew day has actually
got, and it gates what the app is willing to claim.

That distinction is the whole design. On the water stage there is no beer — there is water
in a tank — so the monitor shows a tank, not a glass, and it does not report a final
gravity, an alcohol figure or a style match. Colour arrives when the grain is milled, mash
pH when there is a grist to buffer it, original gravity when the wort reaches the kettle,
bitterness after the boil, alcohol after fermentation, and the scores only once the glass
is poured.

Each stage ends with the brewing action rather than a Next button: mill the grain, mash in,
run off and sparge, pitch the yeast. Progress only ever moves forward, so revisiting an
earlier stage to change something never costs anything — every number simply updates.

## How it is put together

The brewing engine is pure TypeScript in `src/lib/brewing`, with no UI dependency and no
randomness anywhere. The same recipe always produces the same result, which is what makes
it testable and what makes the explanations honest.

| Module            | What it does                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `types.ts`        | The domain model: recipe, ingredients, findings, scores, results |
| `ingredients.ts`  | 28 fermentables, 34 hops, 14 yeast strains                       |
| `water.ts`        | Ion chemistry, brewing salts and a buffered mash-pH model        |
| `calculations.ts` | Gravity, Morey colour, Tinseth IBU, mash profile, attenuation    |
| `sensory.ts`      | The 13-axis flavour prediction and the shared risk signals       |
| `faults.ts`       | Findings with stable codes, severities and score impacts         |
| `scoring.ts`      | Three independent 0–100 scores, each with its contributions      |
| `classify.ts`     | Distance-based matching against 29 style profiles                |
| `explain.ts`      | Key decisions, improvements, the ageing curve, the verdict       |
| `simulate.ts`     | Validation, orchestration and safe handling of nonsense input    |
| `challenges.ts`   | Ten challenges, each a pure predicate over a finished simulation |

`appearance.ts` turns the same simulation into what you see in the glass: SRM colour, haze
from grist proteins and flocculation, head from carbonation and foam-positive malt.

### The part that is not a formula

Three modules do the actual simulating, each integrating over time rather than
looking a number up.

| Module                    | What it simulates                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `mashKinetics.ts`         | Alpha- and beta-amylase activity and denaturation through the rest, giving a real sugar spectrum |
| `fermentationKinetics.ts` | Yeast biology hour by hour: growth budget, sugar preference, flavour, flocculation, stalls       |
| `variance.ts`             | The same brew day 240 times over realistic execution error, and what the spread is made of       |

The mash produces glucose, maltose, maltotriose and dextrins in proportions
that follow from the temperature you held and how long you held it. The
fermentation eats them in the order a yeast actually eats them, and the
esters, fusels and diacetyl all come out of one mechanism — how much the yeast
grew, and how warm it was while growing. Attenuation is therefore an outcome
rather than a strain property.

Five things are built on top: `forecast.ts` narrows a range of what the beer
could still become as decisions land; `target.ts` compares that projection
with the style you said you wanted, from the first grain onward; `taster.ts`
writes a first-person tasting note from the finished model; `rigs.ts` turns
"what are you brewing on" into brewhouse efficiency and collection volume; and
`playback.ts` hands the panel the frames the model computed on the way — the
mash minute by minute, the boil, the fermentation day by day — so pressing
"Mash in" shows the hour happen rather than a label change.

### What the model is, and is not

Established formulas are used where they exist, and are named in the code: Tinseth for
boiled-hop bitterness, Morey for colour, `(OG − FG) × 131.25` for alcohol. Everything past
that — the sensory axes, the fault probabilities, the three scores — is a heuristic model
built to be explainable rather than precise.

The mash-pH estimate deserves a specific warning. It treats the mash as one buffered
system: every malt contributes a distilled-water pH and a buffering capacity, the water's
residual alkalinity is converted to milliequivalents across the mash volume, and acid
additions are subtracted the same way. That is a teaching model, not a titration. Real malt
varies batch to batch and 0.1 pH of disagreement with your meter is entirely normal.

Nothing in the app is blocked. Strange choices produce warnings and consequences, never a
disabled button.

### The UI

SvelteKit 2 with Svelte 5 runes, Tailwind 4 and a single committed dark theme. Design
tokens live in `src/routes/layout.css`, authored in OKLCH; contrast figures for every token
are documented there. The process navigator, stage panels and the persistent "Your beer"
monitor all read from one `$derived` simulation, so every control moves the whole beer at
once.

## The other documents

- `STAGES.md` — what each stage is for, and the rules the UI is held to. The
  standard, not a description.
- `CLAUDE.md` — how to work in this repo, and the lessons that cost something.
- `STATUS.md` — where the work has got to, what was parked on purpose, and what
  is still missing.
- `GRAPHICS.md` — how the graphics are made, and what scene, camera, material,
  environment map and instancing mean, as used in the 3D vessel.

## Licence and contributions

MIT. Use it, fork it, take the engine and put it somewhere else.

Published to be read and used, not maintained collaboratively — issues are
closed and pull requests are not reviewed. If you want something changed, fork
it; that is what the licence is for.
