import { Address } from "./providers";

export function formatLocation(address: Address) {
  if (!address.suburb || !address.state || !address.postcode)
    return address.addressString;
  return `${address.suburb} ${address.state} ${address.postcode}`;
}

export function clampRating(rating: number) {
  if (Number.isNaN(rating)) return 0;
  return Math.max(0, Math.min(5, rating));
}
