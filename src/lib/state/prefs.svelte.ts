/**
 * Small per-viewer preferences. These live in localStorage because losing them
 * costs the user nothing, and they never need to reach anything but this
 * browser.
 */
const KEY = 'brewlab:prefs';

type Prefs = {
	motion: boolean;
	showWhy: boolean;
	advanced: boolean;
	/** The vessel as a lit 3D scene, or the flat drawing. */
	vessel3d: boolean;
};

const DEFAULTS: Prefs = { motion: true, showWhy: true, advanced: false, vessel3d: true };

function read(): Prefs {
	if (typeof localStorage === 'undefined') return DEFAULTS;
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
	} catch {
		return DEFAULTS;
	}
}

class PrefsStore {
	motion = $state(DEFAULTS.motion);
	showWhy = $state(DEFAULTS.showWhy);
	advanced = $state(DEFAULTS.advanced);
	vessel3d = $state(DEFAULTS.vessel3d);
	/** True when the system asks for reduced motion. Motion is then off by default. */
	systemReducedMotion = $state(false);

	get animate() {
		return this.motion && !this.systemReducedMotion;
	}

	hydrate() {
		if (typeof window === 'undefined') return;
		const stored = read();
		this.systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.motion = stored.motion;
		this.showWhy = stored.showWhy;
		this.advanced = stored.advanced;
		this.vessel3d = stored.vessel3d;
	}

	persist() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(
				KEY,
				JSON.stringify({
					motion: this.motion,
					showWhy: this.showWhy,
					advanced: this.advanced,
					vessel3d: this.vessel3d
				})
			);
		} catch {
			// Private browsing refuses this. The app works without it.
		}
	}
}

export const prefs = new PrefsStore();
