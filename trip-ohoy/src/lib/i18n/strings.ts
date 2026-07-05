// All user-facing copy lives here so a second locale (e.g. Norwegian, the language of
// the original prototype) can be added later without hunting through components.
// For M1 there is a single `en` dictionary; `t` just returns it.

export const en = {
	// Navigation
	back: '← Trips',
	// Trip list
	newTrip: '+ New trip',
	tripsEmpty: 'No trips yet.',
	days: (n: number) => `${n} day${n === 1 ? '' : 's'}`,
	// TripForm
	tripFormTitle: 'New trip',
	destinationLabel: 'Destination',
	destinationPlaceholder: 'e.g. Mauritius',
	departureDateLabel: 'Departure',
	returnDateLabel: 'Return',
	basesLabel: 'Bases & accommodation',
	addBase: '+ Add base',
	basePlaceholder: 'e.g. Grand Baie',
	createTrip: 'Create trip',
	// EditTripModal
	editTripTitle: 'Edit trip',
	editTripDatesNote: 'Changing the dates adds or removes day columns. Days you keep hold on to their plans.',
	saveChanges: 'Save changes',
	// ActivityForm
	newActivityTitle: 'New activity',
	editActivityTitle: 'Edit activity',
	emojiLabel: 'Emoji',
	activityNameLabel: 'Name',
	activityNamePlaceholder: 'e.g. Snorkeling trip',
	categoryLabel: 'Category',
	durationLabel: 'Duration',
	durationPlaceholder: 'e.g. Full day',
	energyLabel: 'Energy',
	weatherLabel: 'Weather',
	needsCarLabel: 'Needs a car',
	reusableLabel2: 'Reusable',
	confirmedLabel: 'Definite',
	placeLabelField: 'Place name',
	locationLabel: 'Location',
	saveActivity: 'Save activity',
	deleteActivity: 'Delete activity',
	deleteActivityConfirm: 'Delete this activity? All placements will be removed.',
	cancel: 'Cancel',
	newActivityBtn: '+ New activity',
	// Bases modal
	manageBasesTitle: 'Manage bases',
	removeBase: 'Remove',
	// Planner
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
