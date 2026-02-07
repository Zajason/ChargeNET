"use client";

import { useEffect, useMemo, useState } from "react";
import { Map, Marker, Overlay } from "pigeon-maps";
import { Menu, Filter, LocateFixed, List, MapIcon } from "lucide-react";

import { ChargerDetails } from "./ChargerDetails";
import { UserLocationMarker } from "./UserLocationMarker";
import { FilterMenu } from "./FilterMenu";
import type { Filters } from "./FilterMenu";
import { MenuPanel } from "./MenuPanel";
import { ListView } from "./ListView";

import { useUserLocation } from "../hooks/useUserLocation";
import { useFetchChargers } from "../hooks/useFetchChargers";
import { reserveCharger, cancelReservation } from "../utils/api";
import type { Charger } from "../types/charger";

function cartoPositronProvider(x: number, y: number, z: number) {
  const sub = ["a", "b", "c"][(x + y + z) % 3];
  return `https://${sub}.basemaps.cartocdn.com/rastertiles/light_all/${z}/${x}/${y}.png`;
}

export function MapView() {
  const { chargers, loading, error, reload } = useFetchChargers();

  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [reservedChargers, setReservedChargers] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  // Initialize reservation state from backend-provided flags
  useEffect(() => {
    if (!chargers || chargers.length === 0) {
      setReservedChargers(new Set());
      setHasActiveReservation(false);
      return;
    }

    const mine = new Set<string>();
    for (const c of chargers) {
      if ((c as any).reserved_by_me) mine.add(String(c.id));
    }

    setReservedChargers(mine);
    setHasActiveReservation(mine.size > 0);
  }, [chargers]);

  // ✅ list/map toggle
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const [filters, setFilters] = useState<Filters>({
    status: new Set<Charger["status"]>(["available", "in_use", "outage"]),
    connectorType: new Set<Charger["connectorType"]>(),
    minPower: null,
  });

  const { location: userLocation, error: locationError } = useUserLocation();

  // Fallback to Athens center if user denies location or it hasn't loaded yet
  const fallback = { lat: 37.9838, lng: 23.7275 };
  const effectiveUserLocation = userLocation ?? fallback;

  const [mapCenter, setMapCenter] = useState<[number, number]>([fallback.lat, fallback.lng]);
  const [zoom, setZoom] = useState(13);
  const [followUser, setFollowUser] = useState(true);

  useEffect(() => {
    if (!userLocation) return;
    if (!followUser) return;
    setMapCenter([userLocation.lat, userLocation.lng]);
  }, [userLocation, followUser]);

  const filteredChargers = useMemo(() => {
    return chargers.filter((charger) => {
      if (!filters.status.has(charger.status)) return false;

      if (filters.connectorType.size > 0 && !filters.connectorType.has(charger.connectorType)) {
        return false;
      }

      if (filters.minPower !== null && charger.maxKW < filters.minPower) return false;

      return true;
    });
  }, [chargers, filters]);

  const listChargers = useMemo(() => {
    const mapped = filteredChargers.map((c: any) => ({
      ...c,
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

    // Sort: reserved by current user first
    return mapped.sort((a, b) => {
      if (a.reserved_by_me && !b.reserved_by_me) return -1;
      if (!a.reserved_by_me && b.reserved_by_me) return 1;
      return 0;
    });
  }, [filteredChargers]);

  const handleReserve = async (chargerId: string, minutes?: number) => {
    setReservationError(null);
    setIsReserving(true);

    try {
      await reserveCharger(chargerId, minutes);
      // refresh authoritative state from backend and update selected popup
      const newList = await reload();
      const updated = newList.find((c) => c.id === chargerId) ?? null;
      setSelectedCharger(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reservation failed. Please try again.";
      setReservationError(message);
    } finally {
      setIsReserving(false);
    }
  };

  const handleCancel = async (chargerId: string) => {
    setReservationError(null);
    try {
      await cancelReservation(chargerId);
      // refresh authoritative state from backend and update selected popup
      const newList = await reload();
      const updated = newList.find((c) => c.id === chargerId) ?? null;
      setSelectedCharger(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cancel failed";
      setReservationError(message);
    }
  };

  // Keep the open details panel in sync with the latest charger data
  useEffect(() => {
    if (!selectedCharger) return;
    const updated = chargers.find((c) => c.id === selectedCharger.id);
    if (!updated) return; // charger no longer in list

    // shallow check for changes we care about (status / reserved_by_me)
    if (
      updated.status !== selectedCharger.status ||
      Boolean((updated as any).reserved_by_me) !== Boolean((selectedCharger as any).reserved_by_me)
    ) {
      setSelectedCharger(updated);
    }
  }, [chargers, selectedCharger]);

  const getMarkerColor = (status: Charger["status"], reserved_by_me?: boolean) => {
    // If reserved by current user, show purple/violet
    if (reserved_by_me) {
      return "#A855F7"; // purple-500
    }
    
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

  const handleChargerSelectFromList = (charger: Charger) => {
    setViewMode("map");
    setSelectedCharger(charger);
    setMapCenter([charger.lat, charger.lng]);
    setZoom(15);
    setFollowUser(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading chargers...</div>;
  }
  if (error) {
    return <div className="flex justify-center items-center text-red-600 h-full">{error}</div>;
  }

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

      {/* View toggle - Top Center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 sm:top-4 lg:top-6 bg-white rounded-lg shadow-lg z-[1000] flex">
        <button
          onClick={() => setViewMode("map")}
          className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-l-lg transition-colors flex items-center gap-2 ${
            viewMode === "map"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          aria-label="Map View"
        >
          <MapIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base hidden sm:inline">Map</span>
        </button>

        <button
          onClick={() => setViewMode("list")}
          className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-r-lg transition-colors flex items-center gap-2 ${
            viewMode === "list"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
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

      {/* Recenter button (map only) */}
      {viewMode === "map" && (
        <button
          onClick={recenter}
          className="absolute bottom-16 left-3 sm:bottom-4 sm:left-4 lg:bottom-6 lg:left-6 bg-white px-3 py-2 rounded-lg shadow-lg z-[1000] hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
          aria-label="Recenter"
          title={followUser ? "Following your location" : "Recenter to your location"}
        >
          <LocateFixed className="w-4 h-4" />
          {followUser ? "Following" : "Recenter"}
        </button>
      )}

      {/* Location error banner */}
      {locationError && (
        <div className="absolute top-16 left-3 right-3 sm:top-20 sm:left-4 sm:right-4 lg:top-24 lg:left-6 lg:right-6 bg-white/95 border border-gray-200 rounded-lg shadow z-[1000] px-3 py-2 text-sm text-gray-700">
          Location unavailable: {locationError}
        </div>
      )}

      {/* Main content */}
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
                color={getMarkerColor(charger.status, charger.reserved_by_me)}
                onClick={() => setSelectedCharger(charger)}
              />
            ))}
          </Map>

          {/* Charger Details Modal */}
          {selectedCharger && (
            <ChargerDetails
              charger={selectedCharger}
              onClose={() => setSelectedCharger(null)}
              onReserve={handleReserve}
              isReserved={(selectedCharger as any).reserved_by_me ?? reservedChargers.has(selectedCharger.id)}
              isReserving={isReserving}
              hasActiveReservation={hasActiveReservation}
              error={reservationError}
              onErrorClose={() => setReservationError(null)}
              onCancel={handleCancel}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 lg:bottom-6 lg:right-6 bg-white p-3 sm:p-4 rounded-lg shadow-lg z-[1000] hidden md:block max-w-[200px] text-slate-900">
            <h3 className="mb-2 text-sm lg:text-base">Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-blue-500 border border-white shadow-sm" />
                </div>
                <span className="text-xs lg:text-sm">Your Location</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-xs lg:text-sm">Available</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-purple-500 flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Your Reservation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-orange-500 flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">In Use</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-xs lg:text-sm">Outage</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ListView
          chargers={filteredChargers}
          userLocation={effectiveUserLocation}
          onChargerSelect={handleChargerSelectFromList}
        />
      )}

      <FilterMenu
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <MenuPanel isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}