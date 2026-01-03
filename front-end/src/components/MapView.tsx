"use client";

import { useState } from "react";
import { Map, Marker } from "pigeon-maps";
import { ChargerDetails } from "./ChargerDetails";
import type { Charger } from "../types/charger";
import { useFetchChargers } from "../hooks/useFetchChargers";

function grayscaleProvider(x: number, y: number, z: number) {
  return `https://tiles.stadiamaps.com/tiles/alidade_smooth/${z}/${x}/${y}.png`;
}

export function MapView() {
  const { chargers, loading, error } = useFetchChargers();
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [reservedChargers, setReservedChargers] = useState<Set<string>>(new Set());

  const handleReserve = (chargerId: string) => {
    setReservedChargers(prev => new Set(prev).add(chargerId));
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

  if (loading) return <div className="flex justify-center items-center h-full">Loading chargers...</div>;
  if (error) return <div className="flex justify-center items-center text-red-600 h-full">{error}</div>;

  return (
    <div className="relative w-full h-full">
      <Map
        defaultCenter={[37.7749, -122.4194]}
        defaultZoom={13}
        height={600}
        provider={grayscaleProvider}
        attribution={false}
      >
        {chargers.map(charger => (
          <Marker
            key={charger.id}
            anchor={[charger.lat, charger.lng]}
            color={getMarkerColor(charger.status)}
            onClick={() => setSelectedCharger(charger)}
          />
        ))}
      </Map>

      {selectedCharger && (
        <ChargerDetails
          charger={selectedCharger}
          onClose={() => setSelectedCharger(null)}
          onReserve={handleReserve}
          isReserved={reservedChargers.has(selectedCharger.id)}
        />
      )}
    </div>
  );
}