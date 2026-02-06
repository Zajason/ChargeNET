"use client";

import { useEffect, useMemo, useState } from "react";
import { Map, Marker, Overlay } from "pigeon-maps";
import { Menu, Filter, LocateFixed, List, MapIcon } from "lucide-react";

import { ChargerDetails } from "./ChargerDetails";
import { UserLocationMarker } from "./UserLocationMarker";
import { FilterMenu } from "./FilterMenu";
import { MenuPanel } from "./MenuPanel";
import { ListView } from "./ListView";

import { useUserLocation } from "../hooks/useUserLocation";
import { useFetchChargers } from "../hooks/useFetchChargers";
import type { Charger } from "../types/charger";

// Custom grayscale map provider
function cartoPositronProvider(x: number, y: number, z: number) {
  const sub = ["a", "b", "c"][(x + y + z) % 3];
  return `https://${sub}.basemaps.cartocdn.com/rastertiles/light_all/${z}/${x}/${y}.png`;
}

type Filters = {
  status: Set<Charger["status"]>;
  connectorType: Set<string>;
  minPower: number | null;
};

export function MapView() {
  const { chargers, loading, error } = useFetchChargers();

  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [reservedChargers, setReservedChargers] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ✅ NEW: view mode toggle (map/list)
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const [filters, setFilters] = useState<Filters>({
    status: new Set<Charger["status"]>(["available", "in_use", "outage"]),
    connectorType: new Set<string>(),
    minPower: null,
  });

  const { location: userLocation, error: locationError } = useUserLocation();

  // Fallback if user denies location or it hasn't loaded yet
  const fallback = { lat: 37.7749, lng: -122.4194 };
  const effectiveUserLocation = userLocation ?? fallback;

  // Controlled map center + follow mode
  const [mapCenter, setMapCenter] = useState<[number, number]>([fallback.lat, fallback.lng]);
  const [zoom, setZoom] = useState(13);
  const [followUser, setFollowUser] = useState(true);

  useEffect(() => {
    if (!userLocation) return;
    if (!followUser) return;
    setMapCenter([userLocation.lat, userLocation.lng]);
  }, [userLocation, followUser]);

  // Normalize backend/mock field differences
  const getConnectorType = (c: any): string => c.connectorType ?? c.type ?? "";
  const getPowerKw = (c: any): number => {
    if (typeof c.maxKW === "number") return c.maxKW;
    if (typeof c.power === "number") return c.power;
    if (typeof c.power === "string") {
      const n = parseInt(c.power, 10);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const filteredChargers = useMemo(() => {
    return chargers.filter((charger: any) => {
      if (!filters.status.has(charger.status)) return false;

      const ct = getConnectorType(charger);
      if (filters.connectorType.size > 0 && !filters.connectorType.has(ct)) return false;

      if (filters.minPower !== null) {
        const kw = getPowerKw(charger);
        if (kw < filters.minPower) return false;
      }

      return true;
    });
  }, [chargers, filters]);

  // ✅ Ensure ListView always receives the fields it expects
  const listChargers = useMemo(() => {
    return filteredChargers.map((c: any) => ({
      ...c,
      // ListView expects these (based on your Figma Make code):
      address: c.address ?? c.location?.address ?? c.streetAddress ?? "Unknown address",
      power:
        typeof c.power === "string"
          ? c.power
          : typeof c.maxKW === "number"
            ? `${c.maxKW} kW`
            : typeof c.power === "number"
              ? `${c.power} kW`
              : "—",
      type: c.type ?? c.connectorType ?? "—",
      pricePerKwh:
        typeof c.pricePerKwh === "number"
          ? c.pricePerKwh
          : typeof c.price_per_kwh === "number"
            ? c.price_per_kwh
            : typeof c.price === "number"
              ? c.price
              : 0,
    })) as Charger[];
  }, [filteredChargers]);

  const handleReserve = (chargerId: string) => {
    setReservedChargers((prev) => new Set(prev).add(chargerId));
    setTimeout(() => setSelectedCharger(null), 500);
  };

  const getMarkerColor = (status: Charger["status"]) => {
    switch (status) {
      case "available":
        return "#3B82F6";
      case "in_use":
        return "#F97316";
      case "outage":
        return "#EF4444";
      default:
        return "#9CA3AF";
    }
  };

  const recenter = () => {
    const c = userLocation ?? fallback;
    setMapCenter([c.lat, c.lng]);
    setZoom(15);
    setFollowUser(true);
  };

  // ✅ List click -> switch to map, open details, recenter nicely
  const handleChargerSelectFromList = (charger: Charger) => {
    setViewMode("map");
    setSelectedCharger(charger);
    setMapCenter([charger.lat, charger.lng]);
    setZoom(15);
    setFollowUser(false);
  };

  if (loading) return <div className="flex justify-center items-center h-full">Loading chargers...</div>;
  if (error) return <div className="flex justify-center items-center text-red-600 h-full">{error}</div>;

  return (
    <div className="relative w-full h-full">
      {/* Menu button - Top Left */}
      <button
        onClick={() => setIsMenuOpen((v) => !v)}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 lg:top-6 lg:left-6 bg-white p-2.5 sm:p-3 rounded-lg shadow-lg z-[1000] hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
      </button>

      {/* ✅ View toggle button - Top Center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 sm:top-4 lg:top-6 bg-white rounded-lg shadow-lg z-[1000] flex">
        <button
          onClick={() => setViewMode("map")}
          className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-l-lg transition-colors flex items-center gap-2 ${
            viewMode === "map" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          aria-label="Map View"
        >
          <MapIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base hidden sm:inline">Map</span>
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-r-lg transition-colors flex items-center gap-2 ${
            viewMode === "list" ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          aria-label="List View"
        >
          <List className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base hidden sm:inline">List</span>
        </button>
      </div>

      {/* Filter button - Top Right */}
      <button
        onClick={() => setIsFilterOpen((v) => !v)}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-6 lg:right-6 bg-white p-2.5 sm:p-3 rounded-lg shadow-lg z-[1000] hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Filter"
      >
        <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
      </button>

      {/* Recenter / Follow button - Bottom Left (only useful in map view) */}
      {viewMode === "map" && (
        <button
          onClick={recenter}
          className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 lg:bottom-6 lg:left-6 bg-white px-3 py-2 rounded-lg shadow-lg z-[1000] hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
          aria-label="Recenter"
          title={followUser ? "Following your location" : "Recenter to your location"}
        >
          <LocateFixed className="w-4 h-4" />
          {followUser ? "Following" : "Recenter"}
        </button>
      )}

      {/* Optional location error banner */}
      {locationError && (
        <div className="absolute top-16 left-3 right-3 sm:top-20 sm:left-4 sm:right-4 lg:top-24 lg:left-6 lg:right-6 bg-white/95 border border-gray-200 rounded-lg shadow z-[1000] px-3 py-2 text-sm text-gray-700">
          Location unavailable: {locationError}
        </div>
      )}

      {/* ✅ Map vs List */}
      {viewMode === "map" ? (
        <>
          <Map
            center={mapCenter}
            zoom={zoom}
            provider={cartoPositronProvider}
            attribution={<span>© OpenStreetMap contributors © CARTO</span>}
            attributionPrefix={false}
            onBoundsChanged={({ center, zoom }) => {
              setMapCenter(center);
              setZoom(zoom);
              setFollowUser(false);
            }}
          >
            {userLocation && (
              <Overlay anchor={[userLocation.lat, userLocation.lng]} offset={[20, 20]}>
                <UserLocationMarker />
              </Overlay>
            )}

            {filteredChargers.map((charger) => (
              <Marker
                key={charger.id}
                anchor={[charger.lat, charger.lng]}
                color={getMarkerColor(charger.status)}
                onClick={() => setSelectedCharger(charger)}
              />
            ))}
          </Map>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 lg:bottom-6 lg:right-6 bg-white p-3 sm:p-4 rounded-lg shadow-lg z-[1000] hidden md:block max-w-[200px] text-slate-900">
        <h3 className="mb-2 text-sm lg:text-base">Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-4 h-4">
              <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-blue-500 border border-white shadow-sm"></div>
          {selectedCharger && (
            <ChargerDetails
              charger={selectedCharger}
              onClose={() => setSelectedCharger(null)}
              onReserve={handleReserve}
              isReserved={reservedChargers.has(selectedCharger.id)}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 lg:bottom-6 lg:right-6 bg-white p-3 sm:p-4 rounded-lg shadow-lg z-[1000] hidden md:block max-w-[200px]">
            <h3 className="mb-2 text-sm lg:text-base">Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-blue-500 border border-white shadow-sm"></div>
                </div>
                <span className="text-xs lg:text-sm">Your Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-blue-500 flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-orange-500 flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">In Use</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-red-500 flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Outage</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ListView
          chargers={listChargers}
          userLocation={effectiveUserLocation}
          onChargerSelect={handleChargerSelectFromList}
        />
      )}

      {/* Filter Menu */}
      <FilterMenu
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Menu Panel */}
      <MenuPanel isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
