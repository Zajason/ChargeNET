"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  MapPin,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { Charger } from "../types/charger";
import { CartoonCar } from "./ui/CartoonCar";

import { useUserVehicles } from "../hooks/useUserVehicles";
import type { Vehicle } from "../utils/vehicleMapper";

interface ChargerDetailsProps {
  charger: Charger;
  onClose: () => void;
  onReserve: (chargerId: string) => void;
  isReserved: boolean;
}

export function ChargerDetails({
  charger,
  onClose,
  onReserve,
  isReserved,
}: ChargerDetailsProps) {
  const router = useRouter();

  const [timeRemaining, setTimeRemaining] = useState(charger.timeRemaining ?? 0);

  const {
    vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    notLoggedIn,
    hasNoCars,
  } = useUserVehicles();

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!selectedVehicle && vehicles.length > 0) {
      setSelectedVehicle(vehicles[0]);
    }
  }, [vehicles, selectedVehicle]);

  // Timer when charger is in use
  useEffect(() => {
    if (charger.status === "in_use" && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [charger.status, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const connectorLabel = (t?: Charger["connectorType"]) => {
    switch (t) {
      case "CCS":
        return "CCS";
      case "CHADEMO":
        return "CHAdeMO";
      case "TYPE2":
        return "Type 2";
      default:
        return t ?? "Unknown";
    }
  };

  const getStatusColor = () => {
    switch (charger.status) {
      case "available":
        return "text-blue-600 bg-blue-50";
      case "in_use":
        return "text-orange-600 bg-orange-50";
      case "outage":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = () => {
    switch (charger.status) {
      case "available":
        return <CheckCircle className="w-5 h-5" />;
      case "in_use":
        return <Clock className="w-5 h-5" />;
      case "outage":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusText = () => {
    switch (charger.status) {
      case "available":
        return "Available";
      case "in_use":
        return "In Use";
      case "outage":
        return "Out of Service";
      default:
        return "Unknown";
    }
  };

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[1000] max-h-[75vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <Header title={charger.name ?? "Charger"} onClose={onClose} />

          <ChargerContent
            charger={charger}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusText={getStatusText}
            connectorLabel={connectorLabel}
            onReserve={onReserve}
            isReserved={isReserved}
            vehicles={vehicles}
            vehiclesLoading={vehiclesLoading}
            vehiclesError={vehiclesError}
            notLoggedIn={notLoggedIn}
            hasNoCars={hasNoCars}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            goToProfile={() => router.push("/profile")}
          />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block absolute top-4 left-4 bg-white rounded-lg shadow-2xl z-[1000] w-96 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-6">
          <Header title={charger.name ?? "Charger"} onClose={onClose} />

          <ChargerContent
            charger={charger}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusText={getStatusText}
            connectorLabel={connectorLabel}
            onReserve={onReserve}
            isReserved={isReserved}
            vehicles={vehicles}
            vehiclesLoading={vehiclesLoading}
            vehiclesError={vehiclesError}
            notLoggedIn={notLoggedIn}
            hasNoCars={hasNoCars}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            goToProfile={() => router.push("/profile")}
          />
        </div>
      </div>
    </>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex justify-between items-start mb-4">
      <h2 className="text-xl">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

interface ChargerContentProps {
  charger: Charger;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
  getStatusColor: () => string;
  getStatusIcon: () => JSX.Element;
  getStatusText: () => string;
  connectorLabel: (t?: Charger["connectorType"]) => string;
  onReserve: (chargerId: string) => void;
  isReserved: boolean;

  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  vehiclesError: string | null;
  notLoggedIn: boolean;
  hasNoCars: boolean;

  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (v: Vehicle | null) => void;

  goToProfile: () => void;
}

function ChargerContent({
  charger,
  timeRemaining,
  formatTime,
  getStatusColor,
  getStatusIcon,
  getStatusText,
  connectorLabel,
  onReserve,
  isReserved,
  vehicles,
  vehiclesLoading,
  vehiclesError,
  notLoggedIn,
  hasNoCars,
  selectedVehicle,
  setSelectedVehicle,
  goToProfile,
}: ChargerContentProps) {
  const [showVehicleMenu, setShowVehicleMenu] = useState(false);

  // Close the dropdown if selection changes or vehicles refresh
  useEffect(() => {
    setShowVehicleMenu(false);
  }, [selectedVehicle?.id, vehicles.length]);

  const chargerPowerKW = charger.maxKW ?? 0;
  const pricePerKwh = typeof charger.kwhprice === "number" ? charger.kwhprice : 0;

  const estimates = useMemo(() => {
    if (!selectedVehicle || chargerPowerKW <= 0) return null;

    const target = 80;
    const energyNeeded =
      (selectedVehicle.batteryCapacity * (target - selectedVehicle.currentBatteryLevel)) / 100;

    const speed = Math.min(chargerPowerKW, selectedVehicle.maxChargingSpeed);
    const timeMinutes = Math.max(0, Math.round((energyNeeded / speed) * 60));
    const cost = energyNeeded * pricePerKwh;

    return {
      timeMinutes,
      cost: cost.toFixed(2),
      energyNeeded: energyNeeded.toFixed(1),
      target,
    };
  }, [selectedVehicle, chargerPowerKW, pricePerKwh]);

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Vehicle / Estimates */}
      {charger.status === "available" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
          {vehiclesLoading && <p className="text-sm text-gray-600">Loading your cars…</p>}

          {!vehiclesLoading && notLoggedIn && (
            <>
              <p className="text-sm text-gray-700">Sign in to see charging estimates.</p>
              <button
                type="button"
                onClick={goToProfile}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Profile / Sign in
              </button>
            </>
          )}

          {!vehiclesLoading && !notLoggedIn && hasNoCars && (
            <>
              <p className="text-sm text-gray-700">You haven’t linked a car yet.</p>
              <button
                type="button"
                onClick={goToProfile}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Add a car
              </button>
            </>
          )}

          {!vehiclesLoading && !notLoggedIn && !hasNoCars && vehiclesError && (
            <p className="text-sm text-red-600">Failed to load cars: {vehiclesError}</p>
          )}

          {/* ✅ Logged in + cars */}
          {!vehiclesLoading && !notLoggedIn && !hasNoCars && !vehiclesError && (
            <>
              {!selectedVehicle ? (
                <p className="text-sm text-gray-700">Selecting your car…</p>
              ) : (
                <>
                  {/* ✅ Title row is the dropdown trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (vehicles.length > 1) setShowVehicleMenu((v) => !v);
                      }}
                      className={`w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 ${
                        vehicles.length > 1 ? "hover:bg-white/60 cursor-pointer" : "cursor-default"
                      } transition-colors`}
                      aria-haspopup={vehicles.length > 1 ? "listbox" : undefined}
                      aria-expanded={vehicles.length > 1 ? showVehicleMenu : undefined}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CartoonCar color={selectedVehicle.color} className="w-14 h-14 shrink-0" />
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-gray-900 font-medium truncate">
                              {selectedVehicle.brand} {selectedVehicle.model}
                              {selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ""}
                            </p>
                            {selectedVehicle.year ? (
                              <span className="text-gray-500 text-sm shrink-0">
                                ({selectedVehicle.year})
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-gray-500">
                            Battery: {selectedVehicle.currentBatteryLevel}%
                          </p>
                        </div>
                      </div>

                      {vehicles.length > 1 ? (
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${
                            showVehicleMenu ? "rotate-180" : ""
                          }`}
                        />
                      ) : null}
                    </button>

                    {/* Dropdown menu */}
                    {vehicles.length > 1 && showVehicleMenu && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowVehicleMenu(false)}
                          className="fixed inset-0 z-0 cursor-default"
                          aria-label="Close vehicle menu"
                        />
                        <div
                          role="listbox"
                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-56 overflow-y-auto"
                        >
                          {vehicles.map((vehicle) => {
                            const active = vehicle.id === selectedVehicle.id;
                            return (
                              <button
                                type="button"
                                key={vehicle.id}
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setSelectedVehicle(vehicle);
                                  setShowVehicleMenu(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                  active ? "bg-blue-50" : "hover:bg-gray-50"
                                }`}
                              >
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                                  style={{ backgroundColor: vehicle.color }}
                                />
                                <div className="min-w-0">
                                  <p className="text-gray-900 truncate">
                                    {vehicle.brand} {vehicle.model}
                                    {vehicle.variant ? ` ${vehicle.variant}` : ""}
                                  </p>
                                  {vehicle.year ? <p className="text-xs text-gray-500">{vehicle.year}</p> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {estimates && (
                    <div className="space-y-2 pt-2 border-t">
                      <Row
                        icon={<Clock className="w-4 h-4" />}
                        label="Estimated Time"
                        value={`${estimates.timeMinutes} min`}
                      />
                      <Row
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Estimated Cost"
                        value={`€${estimates.cost}`}
                      />
                      <Row
                        icon={<Zap className="w-4 h-4" />}
                        label={`To ${estimates.target}%`}
                        value={`${estimates.energyNeeded} kWh`}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Address */}
      <InfoRow
        icon={<MapPin className="w-5 h-5 text-gray-400" />}
        text={charger.address || "No address provided"}
      />

      {/* Charger Details */}
      <InfoRow
        icon={<Zap className="w-5 h-5 text-gray-400" />}
        text={`${chargerPowerKW} kW • ${connectorLabel(charger.connectorType)}`}
      />

      {/* Timer */}
      {charger.status === "in_use" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-900 mb-1">Estimated Time Remaining</p>
          <p className="text-3xl text-orange-600">{formatTime(timeRemaining)}</p>
        </div>
      )}

      {/* Reserve + Navigate */}
      {charger.status === "available" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onReserve(charger.id)}
            disabled={isReserved}
            className={`w-full py-3 rounded-lg ${
              isReserved ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isReserved ? "Reserved!" : "Reserve Charger"}
          </button>

          <button
            type="button"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${charger.lat},${charger.lng}`,
                "_blank"
              )
            }
            className="w-full py-3 border rounded-lg flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Navigate
          </button>
        </div>
      )}

      {/* Pricing */}
      <div className="pt-4 border-t">
        <p className="text-sm text-gray-500">Pricing</p>
        <p className="text-gray-900">€{pricePerKwh.toFixed(2)}/kWh</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <p className="text-gray-700">{text}</p>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-600">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
