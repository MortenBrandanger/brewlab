# Working on BrewLab

Read this before touching anything. `STAGES.md` is the standard the UI is held
to and `STATUS.md` is where the work has got to; this file is how to work here
and what has already been learned the hard way.

## The two goals, in order

1. **Simple and streamlined to use.** A person who has never brewed should get
   through a brew day understanding what they did at each step and why.
2. **A genuinely ambitious model underneath.** The owner's words: _"mekanikken
   under panseret skal simulere virkeligheten på en så god og detaljert måte som
   mulig"_, and _"poenget her er like mye å pushe grense som å lage en øl
   simulator"_.

These do not compete. Every piece of depth added so far earned its place by
making the surface say something truer, not by adding a control.

## Commands

```sh
pnpm dev          # dev server
pnpm test         # vitest, 199 tests — must stay green
pnpm check        # svelte-check, must be 0 errors 0 warnings
pnpm lint         # prettier + eslint
pnpm build        # static site into build/
```

`pnpm lint` fails on formatting. Run `pnpm exec prettier --write <paths>` after
generating files with a script.

## How to review, and how not to

**The only review that has ever found anything: brew a beer from an empty
kettle in a browser, and read every word as somebody who has never brewed.**
Then check each stage against its block in `STAGES.md`.

Two failure modes to avoid, both of which have cost real work here:

- **Auditing for whatever was last complained about** instead of against the
  standard. The complaint is a symptom; `STAGES.md` is the test.
- **Verifying your own change instead of the page.** The change compiling is
  not evidence the screen is right.

Load recipes from the catalogue only to inspect a finished report. A recipe
loaded that way arrives already judged, which hid a bug where a brew made from
scratch could never reach its own verdict — every report that had been looked
at came in through the back door.

### Contrast auditing

Sample **real pixels**. Reading a computed `color` and parsing it fails: an
OKLCH string painted into a canvas `fillStyle` and read back as a string comes
out black, and the audit reports 1.02:1 everywhere. Paint onto a 1×1 canvas,
read `getImageData`, compute WCAG relative luminance, walk up for the first
opaque background. Skip `sr-only` nodes by bounding-rect size. Expand every
`<details>` first.

## Lessons that cost something

**Every physical action is a step, and brewing decides how many.** There is no
target number of steps. _"jeg har aldri sagt det må være 9 steg!!!!! om
ølbrygging innebærer 1000 steg så lager vi 1000. Ikke prøve å klem noe inn i en
form du har valgt."_

**One question per screen, and never a wizard inside a screen.** A stage panel
that grew its own internal stepper was built once and deleted the same day.

**Cards, not sliders, when the decision is "pick one".** The water stage is the
benchmark: you pick a water and that is that. A row of cards with a slider
underneath asks the same question twice, in a worse unit — that pattern was
removed from batch size and from the run-off screen. An odd value stays
reachable behind its own card ("Another size", "Other"), never as a permanent
second control.

**A control must be a decision somebody actually makes.** "Brewhouse
efficiency" was a slider; nobody dials in 66%. It is a consequence of the kit,
so the screen asks what you are brewing on and derives both efficiency and
collection volume from the answer.

**Read more belongs in context.** Not a page, not a global toggle, not a
paragraph somewhere else on the screen: a `?` next to the thing, opening where
you are reading.

**The hint text says what you are physically doing at this step.** The eighteen
hints in `src/lib/state/questions.ts` are written to be read in order as one
continuous brew day. Changing one means reading its neighbours.

**Never let prose contradict the model.** "A little air here is harmless" was
written on the transfer screen while oxidation was costing up to fourteen
technical points. If a sentence states a consequence, it must come from the
engine.

**One number, one source.** The taster carried its own fault thresholds and a
milk stout arrived with butterscotch in the tasting note and "no significant
faults were found" one paragraph above it. Thresholds now live in `faults.ts`
and are imported. A test fails if the two ever disagree again.

**Check the recipe before blaming the model.** Two example recipes were out of
style and the engine was right both times.

**Determinism is a hard constraint.** No `Math.random` anywhere. The Monte
Carlo layer seeds a mulberry32 PRNG from a hash of the recipe itself, so the
same beer always gets the same spread.

**Keep responses to the owner short.** _"Nå skriver du jævlig mye."_

## Conventions

- Svelte 5 runes only — `$state`, `$derived`, `$derived.by`, `$props`,
  `$props.id()`, snippets, and function bindings
  `bind:value={() => x, (v) => …}`. No stores, no `export let`.
- Tailwind 4 with `@theme` tokens in `src/routes/layout.css`, authored in
  OKLCH. Never a raw colour in a component.
- `adapter-static` with `trailingSlash = 'always'`. Do not add `cleanUrls` — it
  breaks the root route.
- The brewing engine in `src/lib/brewing` has no UI import, no randomness and no
  I/O. It runs in tests, in the browser, and anywhere else.
- Comments explain _why_, in prose, at the top of the file and above anything
  non-obvious. That is the house style; match it.
- Commit messages are a sentence that says what changed for the reader, then
  prose explaining why, including what was rejected and what was verified.
