/**
 * Dynamic Pincode to District & State resolution utility
 * Calls India Post API (https://api.postalpincode.in) dynamically for any 6-digit Indian Pincode.
 * No hardcoded static pincodes needed.
 */

export interface PincodeInfo {
  district: string;
  state: string;
  name?: string;
}

// In-memory runtime cache so repeated lookups don't call the API again
const pincodeCache = new Map<string, PincodeInfo>();

/**
 * Synchronously get district and state if already cached in memory or localStorage
 */
export function getCachedPincodeInfo(pincode?: string | null): PincodeInfo | null {
  if (!pincode) return null;
  const clean = pincode.trim().replace(/\D/g, '');
  if (clean.length !== 6) return null;

  if (pincodeCache.has(clean)) {
    return pincodeCache.get(clean)!;
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`pin_${clean}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        pincodeCache.set(clean, parsed);
        return parsed;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return null;
}

/**
 * Dynamically lookup District & State for any 6-digit Indian pincode
 * via official India Post API (https://api.postalpincode.in/pincode/{clean})
 */
export async function lookupPincode(pincode: string): Promise<PincodeInfo | null> {
  const clean = (pincode || '').trim().replace(/\D/g, '');
  if (clean.length !== 6) return null;

  // 1. Check runtime cache
  const cached = getCachedPincodeInfo(clean);
  if (cached) return cached;

  // 2. Dynamic fetch from India Post API
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      const result: PincodeInfo = {
        district: po.District || '',
        state: po.State || '',
        name: po.Name || ''
      };

      if (result.district || result.state) {
        pincodeCache.set(clean, result);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`pin_${clean}`, JSON.stringify(result));
          } catch {
            // Ignore
          }
        }
        return result;
      }
    }
  } catch (err) {
    console.warn(`Dynamic pincode lookup failed for ${clean}:`, err);
  }

  return null;
}
