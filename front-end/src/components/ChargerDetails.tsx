import React from "react";
import { X, MapPin, Zap, AlertCircle, CheckCircle, Clock } from "lucide-react";
import type { Charger } from "../types/charger";

interface ChargerDetailsProps {
  charger: Charger;
  onClose: () => void;
  onReserve: (chargerId: string) => void;
  isReserved: boolean;
}

export function ChargerDetails({ charger, onClose, onReserve, isReserved }: ChargerDetailsProps) {
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

  return (
    <>
      {/* Mobile: Bottom sheet */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[1000] max-h-[70vh] overflow-y-auto">
        <div className="p-6">
          <Header title={charger.name ?? "Charger"} onClose={onClose} />
          <ChargerContent
            charger={charger}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusText={getStatusText}
            onReserve={onReserve}
            isReserved={isReserved}
            connectorLabel={connectorLabel}
          />
        </div>
      </div>

      {/* Desktop: Side panel */}
      <div className="hidden md:block absolute top-4 left-4 bg-white rounded-lg shadow-2xl z-[1000] w-96 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-6">
          <Header title={charger.name ?? "Charger"} onClose={onClose} />
          <ChargerContent
            charger={charger}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusText={getStatusText}
            onReserve={onReserve}
            isReserved={isReserved}
            connectorLabel={connectorLabel}
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
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

interface ChargerContentProps {
  charger: Charger;
  getStatusColor: () => string;
  getStatusIcon: () => React.ReactElement;
  getStatusText: () => string;
  onReserve: (chargerId: string) => void;
  isReserved: boolean;
  connectorLabel: (t?: Charger["connectorType"]) => string;
}

function ChargerContent({
  charger,
  getStatusColor,
  getStatusIcon,
  getStatusText,
  onReserve,
  isReserved,
  connectorLabel,
}: ChargerContentProps) {
  const price = typeof charger.kwhprice === "number" ? charger.kwhprice : 0; // ✅ prevents toFixed crash

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Address */}
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-gray-700">{charger.address || "No address provided"}</p>
      </div>

      {/* Charger Details */}
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-gray-900">{charger.maxKW} kW</p>
          <p className="text-sm text-gray-500">{connectorLabel(charger.connectorType)}</p>
        </div>
      </div>

      {/* In-use info */}
      {charger.status === "in_use" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="text-orange-900">This charger is currently in use</span>
          </div>
        </div>
      )}

      {/* Outage message */}
      {charger.status === "outage" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-900">This charger is currently out of service</span>
          </div>
        </div>
      )}

      {/* Reserve + Navigate */}
      {charger.status === "available" && (
        <div className="space-y-2">
          <button
            onClick={() => onReserve(charger.id)}
            disabled={isReserved}
            className={`w-full py-3 rounded-lg transition-colors ${
              isReserved
                ? "bg-green-500 text-white cursor-default"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isReserved ? "Reserved!" : "Reserve Charger"}
          </button>

          <button
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${charger.lat},${charger.lng}`;
              window.open(url, "_blank");
            }}
            className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Navigate
          </button>
        </div>
      )}

      {/* Pricing */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">Pricing</p>
        <p className="text-gray-900">€{price.toFixed(2)}/kWh</p>
      </div>
    </div>
  );
}
