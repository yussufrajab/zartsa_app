export type ItemCategory = 'electronics' | 'bags' | 'documents' | 'clothing' | 'jewelry' | 'keys' | 'other';
export type ItemStatus = 'REPORTED' | 'FOUND' | 'MATCHED' | 'CLAIMED' | 'UNCLAIMED' | 'REMOVED';

export interface LostItemReport {
  id: string;
  userId: string;
  description: string;
  category: ItemCategory;
  route: string;
  travelDate: string;
  contactInfo: string;
  status: ItemStatus;
  matchedWith: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FoundItemReport {
  id: string;
  reportedBy: string;
  description: string;
  category: ItemCategory;
  busNumber: string;
  route: string;
  foundDate: string;
  photoUrl: string | null;
  status: ItemStatus;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFoundItemsParams {
  route?: string;
  category?: ItemCategory;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}