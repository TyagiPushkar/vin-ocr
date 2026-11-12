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
export async function lookupPincode(pincode: string, skipCache = false): Promise<PincodeInfo | null> {
  const clean = (pincode || '').trim().replace(/\D/g, '');
  if (clean.length !== 6) return null;

  // 1. Check runtime / localStorage cache
  if (!skipCache) {
    const cached = getCachedPincodeInfo(clean);
    if (cached && (cached.district || cached.state)) {
      console.log(`[Pincode] Loaded ${clean} from localStorage cache:`, cached);
      return cached;
    }
  }

  // 2. Dynamic fetch from India Post API
  console.log(`[Pincode] Calling India Post API: https://api.postalpincode.in/pincode/${clean}`);
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      console.warn(`[Pincode] HTTP Error ${res.status} for ${clean}`);
      return null;
    }

    const data = await res.json();
    console.log(`[Pincode] API Response for ${clean}:`, data);

    if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
      const poList = data[0].PostOffice;

      // CRITICAL: Only take District (Revenue District), never Division.
      let district = '';
      let state = '';
      let name = '';

      for (const po of poList) {
        const rawDistrict = (po.District || '').trim();
        if (rawDistrict && rawDistrict.toUpperCase() !== 'NA') {
          district = rawDistrict;
          state = (po.State || '').trim();
          name = (po.Name || '').trim();
          break;
        }
      }

      // Fallback to first office District if not found in loop (never po.Division)
      if (!district && poList[0]) {
        const raw = (poList[0].District || '').trim();
        district = raw.toUpperCase() === 'NA' ? '' : raw;
        state = (poList[0].State || '').trim();
        name = (poList[0].Name || '').trim();
      }

      const result: PincodeInfo = {
        district: district,
        state: state,
        name: name
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
