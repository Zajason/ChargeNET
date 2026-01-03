export interface Charger {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    connectorType: string;
    maxKW: number;
    status: "available" | "in_use" | "outage";
    providerName: string;
    power?: string;
    type?: string;
    pricePerKwh?: number;
    timeRemaining?: number;
  }