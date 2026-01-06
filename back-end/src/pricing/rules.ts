import { ConnectorType } from "@prisma/client";

/**
 * Basic rule set for applying markup on wholesale prices.
 */
export function computeRetailPrice({
  wholesaleEurPerKWh,
  connectorType,
  maxKW,
}: {
  wholesaleEurPerKWh: number;
  connectorType: ConnectorType | string;
  maxKW: number;
}): number {
  const baseMarkup = 0.05; // 5 cent markup baseline
  let connectorPremium = 0;

  switch (connectorType) {
    case "CCS":
      connectorPremium = 0.08;
      break;
    case "CHADEMO":
      connectorPremium = 0.06;
      break;
    case "TYPE2":
      connectorPremium = 0.05;
      break;
    default:
      connectorPremium = 0.05;
  }

  const powerPremium = maxKW > 50 ? 0.07 : 0;

  const finalPrice = wholesaleEurPerKWh + baseMarkup + connectorPremium + powerPremium;

  // round sensibly
  return Number(finalPrice.toFixed(4));
}

/**
 * Very simple lat/lng → zone mapper.
 * Extend with real polygons if you have chargers in several countries.
 */
export function mapLatLngToZone(lat: number, lng: number): string {
  // Currently always return GR zone
  return "10YGR-HTSO-----Y";
}