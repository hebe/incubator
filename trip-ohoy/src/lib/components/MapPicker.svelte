<script lang="ts">
	// Interactive Leaflet map for picking a lat/lng pin in ActivityForm.
	// Click anywhere to place/move the marker; also draggable after placement.
	import { onMount, onDestroy } from 'svelte';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';

	let {
		lat = $bindable(0),
		lng = $bindable(0),
		colorVar = 'var(--action)',
		destination = ''
	}: { lat: number; lng: number; colorVar?: string; destination?: string } = $props();

	let el: HTMLDivElement;
	let map: L.Map | undefined;
	let marker: L.Marker | undefined;

	const hasPinned = $derived(lat !== 0 || lng !== 0);

	function makeIcon() {
		return L.divIcon({
			className: '',
			iconSize: [30, 30],
			iconAnchor: [15, 15],
			html: `<div style="position:relative;width:30px;height:30px;">
				<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;background:${colorVar};opacity:0.18;"></div>
				<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:15px;height:15px;border-radius:50%;background:${colorVar};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
			</div>`
		});
	}

	function attachDrag() {
		marker?.on('dragend', () => {
			const pos = marker!.getLatLng();
			lat = pos.lat;
			lng = pos.lng;
		});
	}

	// Geocode the trip destination (OpenStreetMap Nominatim) and frame its bounding box, so
	// an unpinned map opens zoomed into the general area instead of the whole globe.
	async function frameDestination(query: string) {
		try {
			const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
			const res = await fetch(url, { headers: { Accept: 'application/json' } });
			if (!res.ok) return;
			const results = (await res.json()) as Array<{ boundingbox?: [string, string, string, string] }>;
			const bb = results[0]?.boundingbox;
			// Bail if the user already pinned or the map went away while we were fetching.
			if (!bb || !map || lat !== 0 || lng !== 0) return;
			const [south, north, west, east] = bb.map(Number);
			map.fitBounds(
				[
					[south, west],
					[north, east]
				],
				{ padding: [16, 16] }
			);
		} catch {
			// geocoding is best-effort — fall back to the default world view
		}
	}

	onMount(() => {
		const pinned = lat !== 0 || lng !== 0;
		map = L.map(el, {
			center: pinned ? [lat, lng] : [20, 0],
			zoom: pinned ? 10 : 2,
			zoomControl: true,
			attributionControl: false,
			scrollWheelZoom: true
		});
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

		if (pinned) {
			marker = L.marker([lat, lng], { icon: makeIcon(), draggable: true }).addTo(map);
			attachDrag();
		} else if (destination.trim()) {
			frameDestination(destination.trim());
		}

		map.on('click', (e) => {
			lat = e.latlng.lat;
			lng = e.latlng.lng;
			if (marker) {
				marker.setLatLng(e.latlng);
				marker.setIcon(makeIcon());
			} else {
				marker = L.marker(e.latlng, { icon: makeIcon(), draggable: true }).addTo(map!);
				attachDrag();
			}
		});
	});

	onDestroy(() => map?.remove());
</script>

<div class="wrap">
	<div class="map" bind:this={el}></div>
	{#if !hasPinned}
		<div class="hint">Click on the map to pin the location</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
	}
	.map {
		width: 100%;
		height: 240px;
		border-radius: 12px;
		border: 1px solid var(--border);
		overflow: hidden;
	}
	.map :global(.leaflet-container) {
		width: 100%;
		height: 100%;
		background: transparent;
		font-family: inherit;
	}
	.hint {
		position: absolute;
		bottom: 10px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		font-size: 12px;
		padding: 5px 12px;
		border-radius: 20px;
		pointer-events: none;
		white-space: nowrap;
	}
</style>
