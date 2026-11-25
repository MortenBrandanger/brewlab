#!/usr/bin/env node
/**
 * Order painted images for the hands-on brew day from the Codex CLI.
 *
 * Codex, logged in with a ChatGPT account, has a built-in image tool, so the
 * images come out of that subscription rather than a metered API key. Each
 * brief is handed to `codex exec` with the same style text in front of it,
 * which is what keeps forty images looking like one hand drew them.
 *
 * Only things that never move with the model belong here: the workshop wall,
 * the props standing on the bench. Anything the simulation drives — the
 * colour of the wort, the foam, the flame, the needle — stays code, because a
 * picture of a boil bubbles the same for every beer (see GRAPHICS.md).
 *
 *   node scripts/sprites.mjs            order every image not yet on disk
 *   node scripts/sprites.mjs wall jar   order just these, replacing them
 *
 * A brief with `reference` is sent with that image attached, which is how the
 * pieces of the workshop wall come out as one wall.
 *
 * CODEX_MODEL picks the model Codex runs on; the default is one a ChatGPT
 * account is allowed to use.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'static', 'play');
const { style, images } = JSON.parse(readFileSync(join(root, 'scripts', 'sprites.json'), 'utf8'));
const wanted = process.argv.slice(2);
const model = process.env.CODEX_MODEL ?? 'gpt-6-sol';
mkdirSync(out, { recursive: true });

for (const image of images) {
	const file = join(out, `${image.id}.png`);
	// Opaque pieces are kept as JPEG: a painted wall is 1.8 MB as PNG and a
	// tenth of that as JPEG, with no difference you could see behind the bench.
	const jpeg = join(out, `${image.id}.jpg`);
	if (wanted.length ? !wanted.includes(image.id) : existsSync(file) || existsSync(jpeg)) continue;
	process.stdout.write(`${image.id} … `);
	const shape =
		image.size === '1536x1024' ? 'landscape (about 1536x1024)' : 'square (about 1024x1024)';
	const prompt = [
		`Use your built-in image generation tool to make ONE ${shape} image and save it as ${image.id}.png in the current directory.`,
		image.transparent ? 'It must have a transparent background; keep the alpha.' : '',
		image.reference
			? 'The attached picture is the reference: match its style, light and palette exactly.'
			: '',
		'Do not write code to draw it; generate it. Brief:',
		'',
		style,
		'',
		image.prompt,
		'',
		'When the file is saved, reply with just its path.'
	].join('\n');
	const run = spawnSync(
		'codex',
		[
			'exec',
			'-m',
			model,
			'-C',
			out,
			'--skip-git-repo-check',
			'-s',
			'workspace-write',
			'--ephemeral',
			prompt
		],
		{ stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' }
	);
	if (!existsSync(file)) {
		console.log(`failed\n${run.stderr.slice(-400)}`);
		continue;
	}
	if (!image.transparent) {
		spawnSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', file, '--out', jpeg]);
		if (existsSync(jpeg)) rmSync(file);
	}
	console.log(`static/play/${image.id}.${existsSync(jpeg) ? 'jpg' : 'png'}`);
}
