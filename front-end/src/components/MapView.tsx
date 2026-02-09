"use client";

import { useEffect, useMemo, useState } from "react";
import { Map, Overlay } from "pigeon-maps";
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

/** --- Cluster helpers --- */
type Cluster = {
  id: string;
  lat: number;
  lng: number;
  members: Charger[];
  count: number;
  color: string;
};

const COORD_EPS = 1e-6;
const CLUSTER_PX = 28;

function latLngToPixel(lat: number, lng: number, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function pickClusterColor(members: Charger[]) {
  const anyReserved = members.some((c: any) => Boolean((c as any).reserved_by_me));
  if (anyReserved) return "#A855F7";
  const anyAvailable = members.some((c) => c.status === "available");
  if (anyAvailable) return "#3B82F6";
  const anyInUse = members.some((c) => c.status === "in_use");
  if (anyInUse) return "#F97316";
  return "#EF4444";
}

function isSameCoordinateCluster(members: Charger[]) {
  if (members.length <= 1) return false;
  const a0 = members[0];
  return members.every(
    (c) =>
      Math.abs(c.lat - a0.lat) <= COORD_EPS &&
      Math.abs(c.lng - a0.lng) <= COORD_EPS
  );
}

function ClusterPin({
  color,
  count,
  onClick,
}: {
  color: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="relative cursor-pointer select-none"
      style={{ width: 34, height: 34 }}
      aria-label={count > 1 ? `${count} chargers here` : "Charger"}
      title={count > 1 ? `${count} chargers here` : "Charger"}
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 64 64"
        className="drop-shadow-md"
        aria-hidden="true"
      >
        <path
          d="M32 2C20.4 2 11 11.4 11 23c0 14.7 18.6 34.8 19.4 35.7.9 1 2.3 1 3.2 0C34.4 57.8 53 37.7 53 23 53 11.4 43.6 2 32 2z"
          fill={color}
        />
        <circle cx="32" cy="23" r="10" fill="white" opacity="0.9" />
      </svg>

      {count > 1 && (
        <div
          className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-white text-slate-900 font-semibold shadow"
          style={{ width: 20, height: 20, fontSize: 12 }}
        >
          {count}
        </div>
      )}
    </button>
  );
}

const DEFAULT_RESERVE_MINUTES = 30;

export function MapView() {
  const { chargers, loading, error, reload } = useFetchChargers();

  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [reservedChargers, setReservedChargers] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  // ✅ Persisted timer state lives here (parent)
  const [lastReservationDuration, setLastReservationDuration] = useState<number>(0); // seconds
  const [lastReservationStartTime, setLastReservationStartTime] = useState<number | null>(null); // ms

  // Cluster navigation context
  const [clusterContext, setClusterContext] = useState<{
    ids: string[];
    index: number;
  } | null>(null);

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

  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const [filters, setFilters] = useState<Filters>({
    status: new Set<Charger["status"]>(["available", "in_use", "outage"]),
    connectorType: new Set<Charger["connectorType"]>(),
    minPower: null,
  });

  const { location: userLocation, error: locationError } = useUserLocation();

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

  const clustered = useMemo((): Cluster[] => {
    const clusters: Array<{ members: Charger[]; px: number; py: number }> = [];

    for (const c of filteredChargers) {
      const { x, y } = latLngToPixel(c.lat, c.lng, zoom);

      let bestIdx = -1;
      let bestDist2 = Infinity;

      for (let i = 0; i < clusters.length; i++) {
        const dx = x - clusters[i].px;
        const dy = y - clusters[i].py;
        const d2 = dx * dx + dy * dy;

        if (d2 < CLUSTER_PX * CLUSTER_PX && d2 < bestDist2) {
          bestDist2 = d2;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) {
        clusters.push({ members: [c], px: x, py: y });
      } else {
        clusters[bestIdx].members.push(c);
        const n = clusters[bestIdx].members.length;
        clusters[bestIdx].px = clusters[bestIdx].px + (x - clusters[bestIdx].px) / n;
        clusters[bestIdx].py = clusters[bestIdx].py + (y - clusters[bestIdx].py) / n;
      }
    }

    return clusters.map((cl, idx) => {
      const members = cl.members;
      const lat = members.reduce((s, m) => s + m.lat, 0) / members.length;
      const lng = members.reduce((s, m) => s + m.lng, 0) / members.length;
      const color = pickClusterColor(members);

      return {
        id: `cluster-${zoom}-${idx}-${members.length}`,
        lat,
        lng,
        members,
        count: members.length,
        color,
      };
    });
  }, [filteredChargers, zoom]);

  const handleReserve = async (chargerId: string, minutes?: number) => {
    setReservationError(null);
    setIsReserving(true);

    try {
      const mins = minutes ?? DEFAULT_RESERVE_MINUTES;

      await reserveCharger(chargerId, mins);

      // ✅ start persistent countdown at the moment reserve succeeds
      setLastReservationDuration(mins * 60);
      setLastReservationStartTime(Date.now());

      const newList = await reload();
      const updated = newList.find((c) => String(c.id) === String(chargerId)) ?? null;
      setSelectedCharger(updated);

      // update local reserved flags quickly
      const mine = new Set<string>();
      for (const c of newList) if ((c as any).reserved_by_me) mine.add(String(c.id));
      setReservedChargers(mine);
      setHasActiveReservation(mine.size > 0);
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

      // ✅ clear timer when cancel succeeds
      setLastReservationDuration(0);
      setLastReservationStartTime(null);

      const newList = await reload();
      const updated = newList.find((c) => String(c.id) === String(chargerId)) ?? null;
      setSelectedCharger(updated);

      const mine = new Set<string>();
      for (const c of newList) if ((c as any).reserved_by_me) mine.add(String(c.id));
      setReservedChargers(mine);
      setHasActiveReservation(mine.size > 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cancel failed";
      setReservationError(message);
    }
  };

  useEffect(() => {
    if (!selectedCharger) return;
    const updated = chargers.find((c) => String(c.id) === String(selectedCharger.id));
    if (!updated) return;

    if (
      updated.status !== selectedCharger.status ||
      Boolean((updated as any).reserved_by_me) !== Boolean((selectedCharger as any).reserved_by_me)
    ) {
      setSelectedCharger(updated);
    }
  }, [chargers, selectedCharger]);

  useEffect(() => {
    if (!clusterContext) return;

    const fresh = clusterContext.ids
      .map((id) => chargers.find((c) => String(c.id) === id))
      .filter(Boolean) as Charger[];

    if (fresh.length === 0) {
      setClusterContext(null);
      setSelectedCharger(null);
      return;
    }

    const safeIndex = Math.min(clusterContext.index, fresh.length - 1);
    const nextSelected = fresh[safeIndex];

    if (!selectedCharger || String(selectedCharger.id) !== String(nextSelected.id)) {
      setSelectedCharger(nextSelected);
    }

    const nextIds = fresh.map((c) => String(c.id));
    if (nextIds.join("|") !== clusterContext.ids.join("|")) {
      setClusterContext({ ids: nextIds, index: safeIndex });
    }
  }, [chargers, clusterContext, selectedCharger]);

  const recenter = () => {
    const c = userLocation ?? fallback;
    setMapCenter([c.lat, c.lng]);
    setZoom(15);
    setFollowUser(true);
  };

  const handleChargerSelectFromList = (charger: Charger) => {
    setViewMode("map");
    setClusterContext(null);
    setSelectedCharger(charger);
    setMapCenter([charger.lat, charger.lng]);
    setZoom(15);
    setFollowUser(false);
  };

  const openCluster = (members: Charger[], startIndex = 0) => {
    const ids = members.map((m) => String(m.id));
    setClusterContext({ ids, index: startIndex });
    setSelectedCharger(members[startIndex] ?? null);
  };

  const closeDetails = () => {
    setSelectedCharger(null);
    setClusterContext(null);
  };

  const goPrevInCluster = () => {
    setClusterContext((ctx) => {
      if (!ctx) return ctx;
      const nextIndex = (ctx.index - 1 + ctx.ids.length) % ctx.ids.length;
      const nextId = ctx.ids[nextIndex];
      const nextCharger = chargers.find((c) => String(c.id) === nextId) ?? null;
      setSelectedCharger(nextCharger);
      return { ...ctx, index: nextIndex };
    });
  };

  const goNextInCluster = () => {
    setClusterContext((ctx) => {
      if (!ctx) return ctx;
      const nextIndex = (ctx.index + 1) % ctx.ids.length;
      const nextId = ctx.ids[nextIndex];
      const nextCharger = chargers.find((c) => String(c.id) === nextId) ?? null;
      setSelectedCharger(nextCharger);
      return { ...ctx, index: nextIndex };
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading chargers...</div>;
  }
  if (error) {
    return <div className="flex justify-center items-center text-red-600 h-full">{error}</div>;
  }

  return (
    <div className="relative w-full h-full">
      {/* Menu */}
      <button
        onClick={() => setIsMenuOpen((v) => !v)}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 lg:top-6 lg:left-6 bg-white p-2.5 sm:p-3 rounded-lg shadow-lg z-[1000] hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
      </button>

      {/* View toggle */}
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

      {/* Filter */}
      <button
        onClick={() => setIsFilterOpen((v) => !v)}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-6 lg:right-6 bg-white p-2.5 sm:p-3 rounded-lg shadow-lg z-[1000] hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Filter"
      >
        <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
      </button>

      {/* Recenter */}
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

      {locationError && (
        <div className="absolute top-16 left-3 right-3 sm:top-20 sm:left-4 sm:right-4 lg:top-24 lg:left-6 lg:right-6 bg-white/95 border border-gray-200 rounded-lg shadow z-[1000] px-3 py-2 text-sm text-gray-700">
          Location unavailable: {locationError}
        </div>
      )}

      {/* Main */}
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

            {clustered.map((cl) => (
              <Overlay key={cl.id} anchor={[cl.lat, cl.lng]} offset={[17, 34]}>
                <ClusterPin
                  color={cl.color}
                  count={cl.count}
                  onClick={() => {
                    if (cl.count === 1) {
                      setClusterContext(null);
                      setSelectedCharger(cl.members[0]);
                      return;
                    }

                    if (isSameCoordinateCluster(cl.members)) {
                      openCluster(cl.members, 0);
                      return;
                    }

                    setMapCenter([cl.lat, cl.lng]);
                    setZoom((z) => Math.min(z + 2, 19));
                    setFollowUser(false);

                    if (zoom >= 18) {
                      openCluster(cl.members, 0);
                    }
                  }}
                />
              </Overlay>
            ))}
          </Map>

          {/* Details */}
          {selectedCharger && (
            <ChargerDetails
              charger={selectedCharger}
              onClose={closeDetails}
              onReserve={handleReserve}
              onCancel={handleCancel}
              isReserved={
                (selectedCharger as any).reserved_by_me ??
                reservedChargers.has(String(selectedCharger.id))
              }
              isReserving={isReserving}
              hasActiveReservation={hasActiveReservation}
              error={reservationError}
              onErrorClose={() => setReservationError(null)}
              clusterIndex={clusterContext?.index ?? null}
              clusterCount={clusterContext?.ids.length ?? null}
              onPrevCharger={clusterContext ? goPrevInCluster : undefined}
              onNextCharger={clusterContext ? goNextInCluster : undefined}
              lastReservationDuration={lastReservationDuration}
              lastReservationStartTime={lastReservationStartTime}
            />
          )}
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
