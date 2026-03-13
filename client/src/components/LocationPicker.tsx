import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button } from './ui';

type LatLng = { lat: number; lng: number };

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  onAddressChange?: (address: string) => void;
  label?: string;
  helperText?: string;
  autoLocate?: boolean;
}

const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 };

// Fix missing default marker icons in Vite/ESM builds.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pinIcon = L.divIcon({
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
  html: renderToStaticMarkup(
    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md">
      <div className="h-2 w-2 rounded-full bg-white" />
    </div>
  ),
});

const LocationPicker = ({
  value,
  onChange,
  label = 'Live Location',
  helperText,
  autoLocate = true,
  onAddressChange,
}: LocationPickerProps) => {
  const [isLocating, setIsLocating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAutoLocate = useRef(false);
  const lastResolvedRef = useRef<string>('');

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError('Live location requires HTTPS (or localhost). Please open the app on https.');
      return;
    }

    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        const message =
          err.code === 1
            ? 'Location permission denied. Allow location access in browser settings.'
            : err.code === 2
              ? 'Location unavailable. Please check GPS/Network.'
              : err.code === 3
                ? 'Location request timed out. Try again.'
                : err.message || 'Unable to fetch location';
        setError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (event) => {
        onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
      },
    });
    return null;
  };

  const center = value || DEFAULT_CENTER;

  useEffect(() => {
    if (!autoLocate || didAutoLocate.current || value) return;
    didAutoLocate.current = true;
    handleLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate, value]);

  useEffect(() => {
    if (!value || !onAddressChange) return;
    const key = `${value.lat.toFixed(6)},${value.lng.toFixed(6)}`;
    if (lastResolvedRef.current === key) return;

    const controller = new AbortController();
    const resolveAddress = async () => {
      try {
        setIsResolving(true);
        setError(null);
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          value.lat
        )}&lon=${encodeURIComponent(value.lng)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to resolve address');
        const data = (await response.json()) as { display_name?: string };
        if (data.display_name) {
          lastResolvedRef.current = key;
          onAddressChange(data.display_name);
        } else {
          setError('Address not found for this location');
        }
      } catch (err) {
        if ((err as { name?: string }).name !== 'AbortError') {
          setError('Unable to resolve address');
        }
      } finally {
        setIsResolving(false);
      }
    };

    resolveAddress();
    return () => controller.abort();
  }, [value, onAddressChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
          {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
          {isResolving ? <p className="text-xs text-slate-500">Resolving address...</p> : null}
        </div>
        <Button type="button" variant="ghost" onClick={handleLocate} disabled={isLocating}>
          {isLocating ? 'Locating...' : 'Use Live Location'}
        </Button>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <div className="h-64 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 15 : 5}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler />
          {value ? <Marker position={[value.lat, value.lng]} icon={pinIcon} /> : null}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">Tip: Click on the map to refine the exact location.</p>
    </div>
  );
};

export default LocationPicker;
