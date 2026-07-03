// All user-facing copy lives here so a second locale (e.g. Norwegian, the language of
// the original prototype) can be added later without hunting through components.
// For M1 there is a single `en` dictionary; `t` just returns it.

export const en = {
	overview: 'Overview',
	dayList: 'Day list',
	activitiesCount: (n: number) => `${n} activities`,
	carDays: (n: number) => `${n} car days`,
	boardHint:
		'Pick a day, then click a card in the bank to add it — or drag the card straight into a day column.',
	addingTo: 'Adding to',
	bankTitle: 'Activity bank',
	bankSubtitlePrefix: 'Click a card, or drag it up into a day',
	legendGoodWeather: '☀️ needs good weather',
	legendRainy: '🌧️ good on a rainy day',
	legendCar: '🚗 needs a car',
	legendReusable: '↻ reusable',
	all: 'All',
	emptyDay: 'Empty day',
	emptyDayList: 'No activities planned yet.',
	add: '+ Add',
	addActivity: '+ Add activity',
	planned: '✓ Planned',
	reusableTip: 'Reusable',
	needsCarTip: 'Needs a car',
	remove: 'Remove',
	showDetails: 'Show details',
	done: 'Done',
	pickerKicker: 'Add activity',
	// Badges
	badgeCar: '🚗 Car',
	badgeSun: '☀️ Good weather',
	badgeRain: '🌧️ Rainy day',
	// Detail modal
	reusableLabel: '↻ Reusable',
	whereLabelPrefix: 'Where in',
	openInMaps: '🗺️ Open in Google Maps ↗',
	linksTitle: 'Links & info',
	linkTitlePlaceholder: 'Title (optional)',
	linkUrlPlaceholder: 'Paste a URL…',
	linkAdd: 'Add',
	removeLink: 'Remove link',
	notesTitle: 'Notes',
	notesPlaceholder: 'Booking details, what to remember, who recommended it, times, prices…',
	// Moods
	moodActive: 'Active day',
	moodBalanced: 'Balanced day',
	moodCalm: 'Calm day'
};

export type Dict = typeof en;
export const t: Dict = en;
