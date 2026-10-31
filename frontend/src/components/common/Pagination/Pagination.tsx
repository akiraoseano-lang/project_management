import { ChevronLeft, ChevronRight } from "lucide-react";

import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
}

function getVisiblePages(page: number, totalPages: number): number[] {
  const windowSize = 5;
  const start = Math.max(
    1,
    Math.min(
      page - Math.floor(windowSize / 2),
      totalPages - windowSize + 1,
    ),
  );
  const end = Math.min(totalPages, start + windowSize - 1);

  return Array.from(
    { length: Math.max(end - start + 1, 0) },
    (_, index) => start + index,
  );
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  ariaLabel = "Pagination",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(page, totalPages);

  return (
    <nav className={styles.pagination} aria-label={ariaLabel}>
      <button
        type="button"
        className={styles.arrow}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={18} />
      </button>

      <div className={styles.pages}>
        {pages[0] > 1 && (
          <>
            <button
              type="button"
              className={styles.page}
              onClick={() => onPageChange(1)}
            >
              1
            </button>
            {pages[0] > 2 && (
              <span className={styles.ellipsis}>…</span>
            )}
          </>
        )}

        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`${styles.page} ${
              pageNumber === page ? styles.active : ""
            }`}
            aria-current={pageNumber === page ? "page" : undefined}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && (
              <span className={styles.ellipsis}>…</span>
            )}
            <button
              type="button"
              className={styles.page}
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        className={styles.arrow}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
