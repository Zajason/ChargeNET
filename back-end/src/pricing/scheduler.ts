import { updatePricesForAllChargers } from "./engine.ts";

/**
 * Run once every hour.
 * In production you might replace this with a cron service.
 */
export function schedulePricingUpdates() {
  const oneHour = 60 * 60 * 1000;

  // Run immediately on startup
  updatePricesForAllChargers().catch(console.error);

  setInterval(() => {
    updatePricesForAllChargers().catch(console.error);
  }, oneHour);
}