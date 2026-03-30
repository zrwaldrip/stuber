import React, { useEffect, useRef, useState } from "react";

type OnChangeFn = (departure?: string, destination?: string) => void;

const loadGoogleMaps = (apiKey: string) => {
  if (!apiKey) return Promise.reject(new Error("Google Maps API key is missing"));
  // If already loaded, resolve immediately
  if (typeof window !== "undefined" && (window as any).google && (window as any).google.maps) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-google-maps]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }
    const script = document.createElement("script");
    script.setAttribute("data-google-maps", "true");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
};

const MapPicker: React.FC<{ onChange?: OnChangeFn }> = ({ onChange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);
  const mapsApiLoadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    setLoading(true);
    loadGoogleMaps(key)
      .then(() => {
        if (!mounted) return;
        if (!(window as any).google || !(window as any).google.maps) {
          setError("Google Maps API failed to initialize");
          setLoading(false);
          return;
        }
        // Mark that the maps API loaded; defer creating the Map until after we render the container
        mapsApiLoadedRef.current = true;
        const google = (window as any).google;
        geocoderRef.current = new google.maps.Geocoder();
        // Allow render to show the container before instantiating the Map
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize the map after the API has loaded and after the container is rendered
  useEffect(() => {
    if (!mapsApiLoadedRef.current) return;
    if (loading) return; // wait until container is rendered
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialized

    const google = (window as any).google;
    if (!(google && google.maps)) {
      setError("Google Maps API is not available");
      return;
    }

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 40.247, lng: -111.6499 },
      zoom: 14,
    });

    // Click to place markers. A then B
    mapRef.current.addListener("click", (e: any) => {
      const latLng = e.latLng;
      if (!markerARef.current) {
        placeMarker("A", latLng, true);
      } else if (!markerBRef.current) {
        placeMarker("B", latLng, true);
      }
    });

    // fit to any existing markers (none initially)
    fitToMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const reverseGeocode = async (latLng: { lat: number; lng: number }) => {
    try {
      const geocoder = geocoderRef.current;
      if (!geocoder) return undefined;
      return new Promise<string | undefined>((resolve) => {
        geocoder.geocode({ location: latLng }, (results: any) => {
          if (results && results[0] && results[0].formatted_address) {
            resolve(results[0].formatted_address);
          } else {
            resolve(undefined);
          }
        });
      });
    } catch (err) {
      console.warn("reverseGeocode failed", err);
      return undefined;
    }
  };

  const callOnChange = async () => {
    const a = markerARef.current;
    const b = markerBRef.current;
    let aVal: string | undefined = undefined;
    let bVal: string | undefined = undefined;
    if (a) {
      const posA = a.getPosition();
      const addrA = await reverseGeocode({ lat: posA.lat(), lng: posA.lng() });
      aVal = addrA ?? `${posA.lat().toFixed(6)},${posA.lng().toFixed(6)}`;
    }
    if (b) {
      const posB = b.getPosition();
      const addrB = await reverseGeocode({ lat: posB.lat(), lng: posB.lng() });
      bVal = addrB ?? `${posB.lat().toFixed(6)},${posB.lng().toFixed(6)}`;
    }
    if (onChange) onChange(aVal, bVal);
  };

  const placeMarker = (which: "A" | "B", latLng: any, callChange = true) => {
    const google = (window as any).google;
    const opts: any = {
      position: latLng,
      map: mapRef.current,
      draggable: true,
      label: which,
    };
    const marker = new google.maps.Marker(opts);
    marker.addListener("dragend", () => {
      fitToMarkers();
      if (callChange) callOnChange();
    });

    if (which === "A") {
      if (markerARef.current) markerARef.current.setMap(null);
      markerARef.current = marker;
    } else {
      if (markerBRef.current) markerBRef.current.setMap(null);
      markerBRef.current = marker;
    }

    fitToMarkers();
    if (callChange) callOnChange();
  };

  const fitToMarkers = () => {
    const a = markerARef.current;
    const b = markerBRef.current;
    const google = (window as any).google;
    if (!mapRef.current || !(google && google.maps)) return;
    if (a && b) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(a.getPosition());
      bounds.extend(b.getPosition());
      mapRef.current.fitBounds(bounds, 60);
    } else if (a) {
      mapRef.current.panTo(a.getPosition());
      mapRef.current.setZoom(14);
    } else if (b) {
      mapRef.current.panTo(b.getPosition());
      mapRef.current.setZoom(14);
    }
  };

  const clear = () => {
    if (markerARef.current) {
      markerARef.current.setMap(null);
      markerARef.current = null;
    }
    if (markerBRef.current) {
      markerBRef.current.setMap(null);
      markerBRef.current = null;
    }
    if (onChange) onChange(undefined, undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">Pick on Map</div>
        <div>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
            onClick={clear}
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">Loading map…</div>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Error loading map: {error}</div>
      ) : (
        <div className="h-64 w-full rounded-md border border-border">
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
};

export default MapPicker;
