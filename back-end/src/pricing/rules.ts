import { ConnectorType } from "@prisma/client";

function roundToCents(x: number) {
  return Math.round(x * 100) / 100;
}
function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

// peak window: 18:00–22:00 local time
function isPeakHourLocal(now = new Date()) {
  const h = now.getHours(); // server local time (set TZ properly in prod)
  return h >= 18 && h < 22;
}

export function computeRetailPrice({
  wholesaleEurPerKWh,
  connectorType,
  maxKW,
  now = new Date(),
}: {
  wholesaleEurPerKWh: number;
  connectorType: ConnectorType | string;
  maxKW: number;
  now?: Date;
}): number {
  const isDC = maxKW >= 40 || connectorType === "CCS" || connectorType === "CHADEMO";

  const VAT = 0.24;

  const operatorFee = isDC ? 0.05 : 0.03;
  const gridAdder = isDC ? 0.06 : 0.03;

  const marginRate = isDC ? 0.35 : 0.22;

  const connectorPremium =
    connectorType === "CCS" ? 0.03 :
    connectorType === "CHADEMO" ? 0.02 :
    connectorType === "TYPE2" ? 0.00 : 0.01;

  const powerPremium = isDC ? clamp((maxKW - 50) * 0.0009, 0, 0.12) : 0;

  // ✅ peak adder (your values)
  const peakAdder = isPeakHourLocal(now) ? (isDC ? 0.05 : 0.03) : 0;

  const energyComponent = clamp(wholesaleEurPerKWh, 0.0, 1.5);

  const preMargin =
    energyComponent +
    operatorFee +
    gridAdder +
    connectorPremium +
    powerPremium +
    peakAdder;

  const withMargin = preMargin * (1 + marginRate);
  const withVat = withMargin * (1 + VAT);

  const floored = isDC ? Math.max(withVat, 0.39) : Math.max(withVat, 0.19);
  const capped = isDC ? Math.min(floored, 0.99) : Math.min(floored, 0.69);

  return roundToCents(capped);
}

export function mapLatLngToZone(lat: number, lng: number): string {
  return "10YGR-HTSO-----Y";
}
