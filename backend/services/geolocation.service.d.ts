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
export declare function getGeolocation(ip: string): Promise<GeolocationData | null>;
export declare function getCountryFlag(countryCode: string): string;
export declare function cleanGeolocationCache(): void;
//# sourceMappingURL=geolocation.service.d.ts.map