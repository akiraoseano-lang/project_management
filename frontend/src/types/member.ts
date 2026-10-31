export interface MemberSearchItem {
  user_id: number;
  name: string;
  email: string;
  profile_photo_url: string | null;
  profile_photo_signed_url: string | null;
  bio: string | null;
}

export interface MemberSearchResponse {
  items: MemberSearchItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface MemberSearchQuery {
  query?: string;
  page?: number;
  limit?: number;
}
