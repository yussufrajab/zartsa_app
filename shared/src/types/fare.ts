export type RouteType = 'daladala' | 'shamba';

export interface FareEntry {
  id: string;
  routeType: RouteType;
  departure: string;
  destination: string;
  baseFare: number;
  surcharge: number;
  currency: string;
  effectiveDate: string;
}

export interface FareSearchResult {
  departure: string;
  destination: string;
  baseFare: number;
  surcharge: number;
  totalFare: number;
  currency: string;
  effectiveDate: string;
}