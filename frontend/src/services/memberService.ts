import { api } from "../api/client";

import type {
  MemberSearchQuery,
  MemberSearchResponse,
} from "../types/member";

export async function searchMembers(
  query: MemberSearchQuery = {},
): Promise<MemberSearchResponse> {
  const params = new URLSearchParams({
    q: query.query?.trim() ?? "",
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 20),
  });

  return api<MemberSearchResponse>(`/users/search?${params}`);
}
