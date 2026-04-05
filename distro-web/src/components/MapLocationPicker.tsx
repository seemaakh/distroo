"use client";

import { useState, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  MapMouseEvent,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin, Locate } from "lucide-react";

interface LatLng {
  lat: number;
  lng: number;
}

interface MapLocationPickerProps {
  onLocationChange: (location: LatLng) => void;
  initialLocation?: LatLng;
}

// Default center: Kathmandu
const DEFAULT_CENTER: LatLng = { lat: 27.7172, lng: 85.324 };

function MarkerWithPan({
  position,
  onDrag,
}: {
  position: LatLng;
  onDrag: (pos: LatLng) => void;
}) {
  const map = useMap();

  // AdvancedMarker.onDragEnd receives google.maps.MapMouseEvent
  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        onDrag(newPos);
        map?.panTo(newPos);
      }
    },
    [map, onDrag]
  );

  return (
    <AdvancedMarker
      position={position}
      draggable
      onDragEnd={handleDragEnd}
    />
  );
}

export default function MapLocationPicker({
  onLocationChange,
  initialLocation,
}: MapLocationPickerProps) {
  const [markerPos, setMarkerPos] = useState<LatLng>(
    initialLocation || DEFAULT_CENTER
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const handleDrag = useCallback(
    (pos: LatLng) => {
      setMarkerPos(pos);
      onLocationChange(pos);
    },
    [onLocationChange]
  );

  // Map.onClick receives the library's MapMouseEvent, where latLng is in e.detail
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const ll = e.detail.latLng;
      if (ll) {
        const pos = { lat: ll.lat, lng: ll.lng };
        setMarkerPos(pos);
        onLocationChange(pos);
      }
    },
    [onLocationChange]
  );

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setMarkerPos(location);
        onLocationChange(location);
        setLocating(false);
      },
      () => {
        setError("Unable to retrieve your location. Please pin it manually.");
        setLocating(false);
      }
    );
  }

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return (
      <div className="rounded-xl border border-gray-200 bg-blue-pale p-6 text-center">
        <MapPin size={32} className="mx-auto text-blue mb-2" />
        <p className="text-sm font-medium text-ink">Google Maps not configured</p>
        <p className="text-xs text-gray-400 mt-1">
          Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
        </p>
        <div className="mt-4 bg-white rounded-lg p-3 text-left">
          <p className="text-xs text-gray-600 font-grotesk">
            Lat: {markerPos.lat.toFixed(4)}, Lng: {markerPos.lng.toFixed(4)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">
          Pin your store location
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 text-xs font-medium text-blue border border-blue rounded-lg px-3 py-1.5 hover:bg-blue-pale disabled:opacity-60 transition-colors"
        >
          <Locate size={13} />
          {locating ? "Locating…" : "Use My Location"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm h-64 sm:h-80">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={markerPos}
            center={markerPos}
            defaultZoom={14}
            mapId="distro-delivery-map"
            onClick={handleMapClick}
            className="w-full h-full"
          >
            <MarkerWithPan position={markerPos} onDrag={handleDrag} />
          </Map>
        </APIProvider>
      </div>

      <div className="bg-blue-pale rounded-lg px-4 py-2 flex items-center gap-3">
        <MapPin size={14} className="text-blue flex-shrink-0" />
        <p className="font-grotesk text-xs text-gray-600">
          Lat:{" "}
          <span className="font-semibold text-ink">
            {markerPos.lat.toFixed(4)}
          </span>{" "}
          · Lng:{" "}
          <span className="font-semibold text-ink">
            {markerPos.lng.toFixed(4)}
          </span>
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Drag the marker or tap the map to set your exact delivery location.
      </p>
    </div>
  );
}
