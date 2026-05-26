"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeolocation = getGeolocation;
exports.getCountryFlag = getCountryFlag;
exports.cleanGeolocationCache = cleanGeolocationCache;
const axios_1 = __importDefault(require("axios"));
const geoCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;
async function getGeolocation(ip) {
    if (ip === 'unknown' ||
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.')) {
        return null;
    }
    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    try {
        const response = await axios_1.default.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, { timeout: 5000 });
        if (response.data.status === 'success') {
            const geoData = {
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
            geoCache.set(ip, { data: geoData, timestamp: Date.now() });
            return geoData;
        }
        return null;
    }
    catch (error) {
        console.error(`Geolocation lookup failed for ${ip}:`, error);
        return null;
    }
}
function getCountryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2)
        return '🌍';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
function cleanGeolocationCache() {
    const now = Date.now();
    for (const [ip, cached] of geoCache.entries()) {
        if (now - cached.timestamp > CACHE_TTL) {
            geoCache.delete(ip);
        }
    }
}
setInterval(cleanGeolocationCache, 60 * 60 * 1000);
//# sourceMappingURL=geolocation.service.js.map