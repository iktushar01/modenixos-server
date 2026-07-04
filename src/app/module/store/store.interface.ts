export interface ICreateStorePayload {
  brandName: string;
  slug: string;
  country: string;
  currency?: string;
  description?: string;
}

export interface IUpdateStorePayload {
  brandName?: string;
  slug?: string;
  logo?: string;
  banner?: string;
  country?: string;
  currency?: string;
  description?: string;
  isPublished?: boolean;
  theme?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
}
