import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./WorkspacePagination.module.css";

interface WorkspacePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function WorkspacePagination({
  page,
  totalPages,
  onPageChange,
}: WorkspacePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  return (
    <nav className={styles.pagination} aria-label="Workspace pagination">
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