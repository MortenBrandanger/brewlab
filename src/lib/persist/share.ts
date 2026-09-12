import type { Recipe } from '$lib/brewing/types';
import { normaliseRecipe } from './recipes';

/**
 * Shareable links.
 *
 * The whole recipe is packed into the URL fragment, which browsers never send to
 * a server. Nothing about a shared recipe leaves the two machines involved.
 */

const PREFIX = 'r1:';

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function deflate(text: string): Promise<Uint8Array | undefined> {
	if (typeof CompressionStream === 'undefined') return undefined;
	const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string | undefined> {
	if (typeof DecompressionStream === 'undefined') return undefined;
	try {
		const stream = new Blob([bytes as BlobPart])
			.stream()
			.pipeThrough(new DecompressionStream('deflate-raw'));
		return await new Response(stream).text();
	} catch {
		return undefined;
	}
}

/** Encode a recipe into a URL fragment value. */
export async function encodeRecipe(recipe: Recipe): Promise<string> {
	const json = JSON.stringify(recipe);
	const compressed = await deflate(json);
	if (compressed) return `${PREFIX}z${bytesToBase64Url(compressed)}`;
	return `${PREFIX}p${bytesToBase64Url(new TextEncoder().encode(json))}`;
}

/** Decode a fragment value back into a recipe, or undefined when it is not one. */
export async function decodeRecipe(fragment: string): Promise<Recipe | undefined> {
	const value = fragment.startsWith('#') ? fragment.slice(1) : fragment;
	if (!value.startsWith(PREFIX)) return undefined;
	const payload = value.slice(PREFIX.length);
	const mode = payload[0];
	const body = payload.slice(1);
	try {
		const bytes = base64UrlToBytes(body);
		const json = mode === 'z' ? await inflate(bytes) : new TextDecoder().decode(bytes);
		if (!json) return undefined;
		return normaliseRecipe(JSON.parse(json));
	} catch {
		return undefined;
	}
}

export async function shareUrl(recipe: Recipe, origin: string, pathname = '/'): Promise<string> {
	return `${origin}${pathname}#${await encodeRecipe(recipe)}`;
}
