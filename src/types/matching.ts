import type { MatchTier, Property, PropertyRequest } from '../types';

export interface MatchBreakdownItem {
  key: string;
  label: string;
  weight: number;
  earned: number;
  max: number;
  note?: string;
}

export interface MatchProperty extends Property {
  score: number;
  tier: MatchTier;
  reasons: string[];
  breakdown?: MatchBreakdownItem[];
}

export interface MatchResult {
  property: MatchProperty;
  score: number;
  tier: MatchTier;
  reasons: string[];
  breakdown?: MatchBreakdownItem[];
}

export interface MatchingResponse {
  matches: MatchResult[];
  request?: PropertyRequest;
}

export interface ShareMatchPayload {
  propertyId: number;
  customerId: number;
  requestId: number;
  matchScore: number;
}
