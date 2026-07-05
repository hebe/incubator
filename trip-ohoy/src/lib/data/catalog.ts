// Static reference data: category definitions, palettes, and the Mauritius seed trip
// (ported from the prototype's CATALOG, translated to English, with real lat/lng for the
// Leaflet minimap instead of the prototype's % positions).

import type { CategoryKey, Energy, Mood, Weather } from '$lib/types';

export interface CategoryDef {
	key: CategoryKey;
	label: string;
	colorVar: string; // CSS custom property
}

export const CATEGORIES: CategoryDef[] = [
	{ key: 'water', label: 'Water', colorVar: 'var(--cat-water)' },
	{ key: 'nature', label: 'Nature & adventure', colorVar: 'var(--cat-nature)' },
	{ key: 'sight', label: 'Sight', colorVar: 'var(--cat-sight)' },
	{ key: 'rest', label: 'Rest', colorVar: 'var(--cat-rest)' },
	{ key: 'food', label: 'Food', colorVar: 'var(--cat-food)' },
	{ key: 'shop', label: 'Shopping', colorVar: 'var(--cat-shop)' }
];

export const CATEGORY_BY_KEY: Record<CategoryKey, CategoryDef> = Object.fromEntries(
	CATEGORIES.map((c) => [c.key, c])
) as Record<CategoryKey, CategoryDef>;

export const ENERGY_COLOR: Record<Energy, string> = {
	High: 'var(--energy-high)',
	Medium: 'var(--energy-medium)',
	Low: 'var(--energy-low)'
};

// Mood chip colors: [background, text]
export const MOOD_COLOR: Record<Mood, [string, string]> = {
	'Active day': ['oklch(0.95 0.045 35)', 'oklch(0.5 0.13 35)'],
	'Balanced day': ['oklch(0.95 0.03 230)', 'oklch(0.46 0.09 230)'],
	'Calm day': ['oklch(0.95 0.035 150)', 'oklch(0.45 0.09 150)']
};

// Base chip palette, keyed by colorToken. New bases (M2) cycle through these keys.
export const BASE_PALETTE: Record<string, { color: string; bg: string }> = {
	north: { color: 'oklch(0.42 0.08 220)', bg: 'oklch(0.93 0.03 220)' },
	southwest: { color: 'oklch(0.46 0.11 45)', bg: 'oklch(0.94 0.045 45)' },
	green: { color: 'oklch(0.4 0.09 150)', bg: 'oklch(0.93 0.035 150)' },
	purple: { color: 'oklch(0.44 0.1 300)', bg: 'oklch(0.94 0.035 300)' }
};
export const BASE_PALETTE_KEYS = Object.keys(BASE_PALETTE);

// ── Mauritius seed ──────────────────────────────────────────────────────────
// A single seeded trip so M1 can be matched pixel-for-pixel against the reference
// before trip creation (M2) exists.

export const SEED_TRIP = {
	id: 'seed-mauritius',
	destination: 'Mauritius',
	startDate: '2026-07-31',
	endDate: '2026-08-09'
};

export interface SeedBase {
	colorToken: string;
	name: string;
}
export const SEED_BASES: SeedBase[] = [
	{ colorToken: 'north', name: 'Grand Baie' },
	{ colorToken: 'southwest', name: 'Southwest' }
];

export interface SeedActivity {
	id: string;
	emoji: string;
	name: string;
	category: CategoryKey;
	durationLabel: string;
	energy: Energy;
	weather: Weather;
	needsCar: boolean;
	reusable: boolean;
	confirmed: boolean;
	placeLabel: string;
	lat: number;
	lng: number;
}

export const SEED_ACTIVITIES: SeedActivity[] = [
	// eslint-disable-next-line prettier/prettier
	{ id: 'dolphin', emoji: '🐬', name: 'Dolphin & whale safari', category: 'water', durationLabel: 'Full day', energy: 'High', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: 'Tamarin Bay (west)', lat: -20.3255, lng: 57.3706 },
	{ id: 'snorkel', emoji: '⛵', name: 'Snorkeling – Gabriel Island', category: 'water', durationLabel: 'Full day', energy: 'Medium', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: 'Gabriel Island (north)', lat: -19.8892, lng: 57.6636 },
	{ id: 'casela', emoji: '🦁', name: 'Casela Nature Parks', category: 'nature', durationLabel: 'Full day', energy: 'High', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: 'Cascavelle (west)', lat: -20.2833, lng: 57.3833 },
	{ id: 'chamarel', emoji: '🏔️', name: 'Chamarel – coloured earth', category: 'sight', durationLabel: 'Half day', energy: 'Medium', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: 'Chamarel (southwest)', lat: -20.4436, lng: 57.3736 },
	{ id: 'pamplemousses', emoji: '🌺', name: 'Pamplemousses Botanical Garden', category: 'sight', durationLabel: 'Half day', energy: 'Low', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: 'Pamplemousses (north)', lat: -20.1042, lng: 57.5794 },
	{ id: 'odysseo', emoji: '🐙', name: 'Odysseo Aquarium', category: 'sight', durationLabel: '2 hours', energy: 'Low', weather: 'rainy', needsCar: true, reusable: false, confirmed: false, placeLabel: 'Port Louis (Caudan)', lat: -20.16, lng: 57.4989 },
	{ id: 'beach', emoji: '🌊', name: 'Beach day', category: 'rest', durationLabel: 'Full day', energy: 'Low', weather: 'good', needsCar: false, reusable: true, confirmed: false, placeLabel: 'Grand Baie (north)', lat: -20.0136, lng: 57.5803 },
	{ id: 'pool', emoji: '🛋️', name: 'Rest & pool day', category: 'rest', durationLabel: 'Full day', energy: 'Low', weather: 'any', needsCar: false, reusable: true, confirmed: false, placeLabel: 'At the base', lat: -20.0136, lng: 57.5803 },
	{ id: 'restaurant', emoji: '🍽️', name: 'Dinner out', category: 'food', durationLabel: '2 hours', energy: 'Low', weather: 'any', needsCar: false, reusable: true, confirmed: false, placeLabel: 'Grand Baie centre', lat: -20.0136, lng: 57.5803 },
	{ id: 'homecooked', emoji: '🍳', name: 'Dinner at home', category: 'food', durationLabel: '2 hours', energy: 'Low', weather: 'any', needsCar: false, reusable: true, confirmed: false, placeLabel: 'Home', lat: -20.0136, lng: 57.5803 },
	{ id: 'groceries', emoji: '🛒', name: 'Grocery run (Super U)', category: 'shop', durationLabel: '1 hour', energy: 'Low', weather: 'any', needsCar: true, reusable: true, confirmed: false, placeLabel: 'Super U, Grand Baie', lat: -20.0189, lng: 57.5817 },
	{ id: 'vallee-zipline', emoji: '🤸', name: 'Vallée Adventure Park - zipline', category: 'nature', durationLabel: 'Full day', energy: 'High', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'la-vanille', emoji: '🐢', name: 'La Vanille Nature Park', category: 'nature', durationLabel: 'Half day', energy: 'Medium', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'le-morne', emoji: '🌊', name: 'Le Morne lagune og strand', category: 'water', durationLabel: 'Half day', energy: 'Medium', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'blue-bay', emoji: '🐠', name: 'Blue Bay snorkling', category: 'water', durationLabel: 'Full day', energy: 'Medium', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'pointe-desny', emoji: '🐟', name: 'Pointe d\'Esny snorkling', category: 'water', durationLabel: 'Half day', energy: 'Medium', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'mon-choisy', emoji: '🏖️', name: 'Mon Choisy stranddag', category: 'water', durationLabel: 'Full day', energy: 'Low', weather: 'good', needsCar: true, reusable: true, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'trou-aux-biches', emoji: '🏖️', name: 'Trou aux Biches stranddag', category: 'water', durationLabel: 'Full day', energy: 'Low', weather: 'good', needsCar: true, reusable: true, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'pereybere', emoji: '🏖️', name: 'Pereybere snorkling og strand', category: 'water', durationLabel: 'Half day', energy: 'Low', weather: 'good', needsCar: true, reusable: true, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'flic-en-flac', emoji: '🏄', name: 'Flic en Flac strand', category: 'water', durationLabel: 'Half day', energy: 'Low', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'seven-cascades', emoji: '💧', name: 'Seven Cascades / Tamarind Falls', category: 'nature', durationLabel: 'Half day', energy: 'Medium', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'black-river-gorges', emoji: '🌿', name: 'Black River Gorges viewpoint', category: 'sight', durationLabel: 'Half day', energy: 'Low', weather: 'good', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'trou-aux-cerfs', emoji: '🌋', name: 'Trou aux Cerfs vulkankrater', category: 'sight', durationLabel: '1 hour', energy: 'Low', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'mahebourg', emoji: '⚓', name: 'Mahebourg - marked og waterfront', category: 'sight', durationLabel: 'Half day', energy: 'Low', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'gris-gris', emoji: '🌊', name: 'Gris Gris sørkyst', category: 'sight', durationLabel: '2 hours', energy: 'Low', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'cap-malheureux', emoji: '⛪', name: 'Cap Malheureux kirke', category: 'sight', durationLabel: '1 hour', energy: 'Low', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'curious-corner', emoji: '🎭', name: 'Curious Corner of Chamarel', category: 'sight', durationLabel: '2 hours', energy: 'Low', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'port-louis-market', emoji: '🏪', name: 'Port Louis Central Market', category: 'sight', durationLabel: 'Half day', energy: 'Medium', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 },
	{ id: 'grand-bassin', emoji: '🕉️', name: 'Grand Bassin / Ganga Talao', category: 'sight', durationLabel: 'Half day', energy: 'Medium', weather: 'any', needsCar: true, reusable: false, confirmed: false, placeLabel: '', lat: 0, lng: 0 }
];

// Which base each day starts on (index 0..9): first 7 north, last 3 southwest.
export const SEED_DAY_BASES = [
	'north', 'north', 'north', 'north', 'north', 'north', 'north', 'southwest', 'southwest', 'southwest'
];

// Initial placements: day index → activity ids (in order).
export const SEED_PLACEMENTS: Record<number, string[]> = {
	0: ['groceries', 'homecooked'],
	1: ['beach', 'restaurant'],
	2: ['dolphin'],
	3: ['pool']
};
