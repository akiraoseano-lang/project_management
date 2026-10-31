import { useEffect, useMemo, useState } from "react";
import {
  LoaderCircle,
  Search,
  UserPlus,
  X,
} from "lucide-react";

import { searchMembers } from "../../../services/memberService";
import { getInitials } from "../../../utils/project";

import styles from "./MemberPickerModal.module.css";

export interface MemberOption {
  id: number;
  name: string;
  email: string;
}

interface MemberPickerModalProps {
  open: boolean;
  title: string;
  description?: string;
  candidates?: MemberOption[];
  searchable?: boolean;
  excludeIds?: number[];
  onClose: () => void;
  onSelect: (userId: number) => Promise<void> | void;
}

const SEARCH_DELAY = 300;

export default function MemberPickerModal({
  open,
  title,
  description,
  candidates = [],
  searchable = false,
  excludeIds = [],
  onClose,
  onSelect,
}: MemberPickerModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setSearchInput("");
    setResults([]);
    setError("");
    setSelectingId(null);
  }, [open]);

  useEffect(() => {
    if (!open || !searchable) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const result = await searchMembers({
          query: searchInput,
          limit: 20,
        });

        if (cancelled) return;

        setResults(
          result.items.map((item) => ({
            id: item.user_id,
            name: item.name,
            email: item.email,
          })),
        );
      } catch (err) {
        if (cancelled) return;

        setResults([]);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mencari pengguna.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, SEARCH_DELAY);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [open, searchable, searchInput]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectingId === null) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, selectingId, onClose]);

  const options = useMemo(() => {
    const excluded = new Set(excludeIds);
    const source = searchable ? results : candidates;

    return source.filter((item) => !excluded.has(item.id));
  }, [searchable, results, candidates, excludeIds]);

  if (!open) return null;

  const handleSelect = async (userId: number) => {
    if (selectingId !== null) return;

    setSelectingId(userId);
    setError("");

    try {
      await onSelect(userId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menambahkan member.",
      );
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          selectingId === null
        ) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-picker-title"
      >
        <header className={styles.header}>
          <div>
            <h2 id="member-picker-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={selectingId !== null}
            aria-label="Tutup dialog"
          >
            <X size={19} />
          </button>
        </header>

        <div className={styles.body}>
          {searchable && (
            <div className={styles.search}>
              <Search size={17} />
              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Cari nama atau email..."
                aria-label="Cari pengguna"
                autoFocus
              />
            </div>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <div className={styles.state}>
              <LoaderCircle size={20} className={styles.spinner} />
              <span>Mencari pengguna...</span>
            </div>
          ) : options.length === 0 ? (
            <div className={styles.state}>
              <UserPlus size={20} />
              <span>
                {searchable
                  ? "Tidak ada pengguna yang cocok."
                  : "Tidak ada kandidat member."}
              </span>
            </div>
          ) : (
            <ul className={styles.list}>
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={styles.option}
                    disabled={selectingId !== null}
                    onClick={() => void handleSelect(option.id)}
                  >
                    <span className={styles.avatar}>
                      {getInitials(option.name)}
                    </span>

                    <span className={styles.optionText}>
                      <strong>{option.name}</strong>
                      <span>{option.email}</span>
                    </span>

                    {selectingId === option.id ? (
                      <LoaderCircle
                        size={17}
                        className={styles.spinner}
                      />
                    ) : (
                      <UserPlus size={17} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
