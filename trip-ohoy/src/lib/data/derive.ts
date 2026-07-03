// Pure derivation helpers ported from the prototype's renderVals() (enrich, energyDot,
// mood, needsCar, summary, hostOf). No framework state here — just inputs → outputs.

import type { Activity, Energy, Mood } from '$lib/types';
import { ENERGY_COLOR } from './catalog';
import { t } from '$lib/i18n/strings';

export interface Badge {
	kind: 'car' | 'sun' | 'rain';
	label: string;
}

export function badgesFor(a: Pick<Activity, 'needsCar' | 'weather'>): Badge[] {
	const badges: Badge[] = [];
	if (a.needsCar) badges.push({ kind: 'car', label: t.badgeCar });
	if (a.weather === 'good') badges.push({ kind: 'sun', label: t.badgeSun });
	if (a.weather === 'rainy') badges.push({ kind: 'rain', label: t.badgeRain });
	return badges;
}

export const BADGE_COLORS: Record<Badge['kind'], [string, string]> = {
	car: ['oklch(0.95 0.025 250)', 'oklch(0.42 0.07 250)'],
	sun: ['oklch(0.96 0.05 90)', 'oklch(0.5 0.11 70)'],
	rain: ['oklch(0.95 0.02 235)', 'oklch(0.46 0.05 240)']
};

export function energyColor(energy: Energy): string {
	return ENERGY_COLOR[energy] ?? 'oklch(0.7 0 0)';
}

// Mood of a day given the energies of its placed activities (any High → Active,
// else any Medium → Balanced, else Calm). Empty day → null.
export function moodOf(energies: Energy[]): Mood | null {
	if (energies.length === 0) return null;
	if (energies.some((e) => e === 'High')) return 'Active day';
	if (energies.some((e) => e === 'Medium')) return 'Balanced day';
	return 'Calm day';
}

export function hostOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}

// Normalize a user-typed link: prefix bare domains with https://, fall back label→host.
export function normalizeLink(rawUrl: string, rawLabel: string): { url: string; label: string } | null {
	const raw = rawUrl.trim();
	if (!raw) return null;
	const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
	const label = rawLabel.trim() || hostOf(url);
	return { url, label };
}

export function mapsLink(placeLabel: string, destination: string): string {
	return (
		'https://www.google.com/maps/search/?api=1&query=' +
		encodeURIComponent(placeLabel + ' ' + destination)
	);
}

// ── Date helpers (replace the prototype's hardcoded WDF/WDS/DATES arrays) ──────

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Parse an ISO yyyy-mm-dd as a *local* date (avoid UTC off-by-one).
export function parseISO(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function weekdayShort(iso: string): string {
	return WD_SHORT[parseISO(iso).getDay()];
}
export function weekdayFull(iso: string): string {
	return WD_FULL[parseISO(iso).getDay()];
}
// "31 Jul"
export function dateShort(iso: string): string {
	const d = parseISO(iso);
	return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
// "31 July"
export function dateLong(iso: string): string {
	const d = parseISO(iso);
	return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`;
}

// Every ISO date from start..end inclusive.
export function datesInRange(startISO: string, endISO: string): string[] {
	const out: string[] = [];
	const start = parseISO(startISO);
	const end = parseISO(endISO);
	for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		out.push(`${y}-${m}-${day}`);
	}
	return out;
}

// "31 July – 9 August 2026" style range subtitle.
export function rangeSubtitle(startISO: string, endISO: string): string {
	const s = parseISO(startISO);
	const e = parseISO(endISO);
	const left = `${s.getDate()} ${MONTHS_FULL[s.getMonth()]}`;
	const right = `${e.getDate()} ${MONTHS_FULL[e.getMonth()]} ${e.getFullYear()}`;
	return `${left} – ${right}`;
}
