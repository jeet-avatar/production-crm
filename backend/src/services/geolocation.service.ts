import axios from 'axios';

/**
 * Geolocation Service
 * Provides IP geolocation lookup using ip-api.com (free, no API key required)
 */

export interface GeolocationData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
}

// Cache to avoid redundant API calls
const geoCache = new Map<string, { data: GeolocationData; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get geolocation data for an IP address
 * Uses ip-api.com free service (45 requests/minute limit)
 */
export async function getGeolocation(ip: string): Promise<GeolocationData | null> {
  // Skip localhost and private IPs
  if (
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  ) {
    return null;
  }

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { timeout: 5000 }
    );

    if (response.data.status === 'success') {
      const geoData: GeolocationData = {
        ip: response.data.query,
        country: response.data.country,
        countryCode: response.data.countryCode,
        region: response.data.region,
        regionName: response.data.regionName,
        city: response.data.city,
        zip: response.data.zip,
        lat: response.data.lat,
        lon: response.data.lon,
        timezone: response.data.timezone,
        isp: response.data.isp,
        org: response.data.org,
        as: response.data.as,
      };

      // Cache the result
      geoCache.set(ip, { data: geoData, timestamp: Date.now() });

      return geoData;
    }

    return null;
  } catch (error) {
    console.error(`Geolocation lookup failed for ${ip}:`, error);
    return null;
  }
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Clear old cache entries (run periodically)
 */
export function cleanGeolocationCache() {
  const now = Date.now();
  for (const [ip, cached] of geoCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      geoCache.delete(ip);
    }
  }
}

// Clean cache every hour
setInterval(cleanGeolocationCache, 60 * 60 * 1000);
