<script lang="ts">
	// Small Leaflet orientation panel with a single category-colored pin at the activity's
	// location. Generalizes the prototype's hand-drawn SVG silhouette to any destination.
	import { onMount, onDestroy } from 'svelte';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';

	let { lat, lng, colorVar }: { lat: number; lng: number; colorVar: string } = $props();

	let el: HTMLDivElement;
	let map: L.Map | undefined;

	function pinIcon() {
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

	onMount(() => {
		map = L.map(el, {
			center: [lat, lng],
			zoom: 10,
			zoomControl: false,
			attributionControl: false,
			scrollWheelZoom: false,
			doubleClickZoom: false,
			dragging: true
		});
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
		L.marker([lat, lng], { icon: pinIcon() }).addTo(map);
	});

	onDestroy(() => map?.remove());
</script>

<div class="panel" bind:this={el}></div>

<style>
	.panel {
		width: 168px;
		height: 218px;
		flex: 0 0 auto;
		border-radius: 14px;
		border: 1px solid oklch(0.86 0.04 230);
		overflow: hidden;
		background: linear-gradient(180deg, oklch(0.93 0.045 230), oklch(0.9 0.05 225));
	}
	/* Keep Leaflet controls/panes from spilling the rounded corners */
	.panel :global(.leaflet-container) {
		width: 100%;
		height: 100%;
		background: transparent;
		font-family: inherit;
	}
</style>
