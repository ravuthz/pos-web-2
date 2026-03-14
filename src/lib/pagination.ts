import type { PaginationMeta } from '@/types/api';

export const DEFAULT_TABLE_PAGE_SIZE = 10;
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100] as const;

export function getPaginationMeta(meta?: PaginationMeta) {
  return {
    page: meta?.page ?? meta?.current_page ?? 1,
    size: meta?.size ?? meta?.per_page ?? DEFAULT_TABLE_PAGE_SIZE,
    totalPages: Math.max(meta?.total_pages ?? meta?.last_page ?? 1, 1),
    totalItems: meta?.total_items ?? meta?.total ?? 0
  };
}
