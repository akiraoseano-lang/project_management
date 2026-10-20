import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Save,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import {
  getProfile,
  uploadProfilePhoto,
} from "../../../services/profile";
import type { UserProfile } from "../../../types/profile";
import { notifyProfilePhotoUpdated } from "../../../hooks/useProfilePhoto";
import styles from "./ProfilePhotoPriview.module.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ProfilePhotoPreview = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load the saved profile.
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getProfile();

        if (active) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);

        if (active) {
          setError("Failed to load your profile. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  // Clean up temporary preview URLs.
  useEffect(() => {
    if (!previewUrl) return;

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Close the modal when Escape is pressed.
  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  const currentPhoto =
    previewUrl || profile?.profile_photo_signed_url || null;

  // Validate the selected photo and display a local preview.
  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again.
    event.target.value = "";

    if (!file) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please select a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The maximum photo size is 5 MB.");
      return;
    }

    const localUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(localUrl);
  };

  // Discard the unsaved selection.
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError("");
    setSuccess("");
    setModalOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload the selected photo and refresh the shared avatar.
  const handleSaveChanges = async () => {
    if (!selectedFile || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await uploadProfilePhoto(selectedFile);

      // Fetch the latest profile, including its signed photo URL.
      const updatedProfile = await getProfile();

      setProfile(updatedProfile);

      // Tell Header and Sidebar to reload the latest photo URL.
      notifyProfilePhotoUpdated();

      setSelectedFile(null);
      setPreviewUrl(null);
      setModalOpen(false);

      setSuccess("Your profile photo has been saved successfully.");
    } catch (err) {
      console.error("Failed to save profile photo:", err);

      // Keep the selected file and preview so the user can retry.
      setError("Failed to save your photo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <LoaderCircle size={30} className={styles.spinner} />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.photoPage}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft size={18} />
          Back to profile
        </button>

        <div className={styles.feedbackError} role="alert">
          <XCircle size={18} />
          <span>{error || "Unable to load your profile."}</span>
        </div>

        <button
          type="button"
          className={styles.uploadButton}
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.photoPage}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate("/profile")}
      >
        <ArrowLeft size={18} />
        Back to profile
      </button>

      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>PERSONAL SETTINGS</span>
        <h1>Profile photo</h1>
        <p>
          Choose a photo, preview it, and save when you're ready.
        </p>
      </header>

      {success && (
        <div className={styles.feedbackSuccess} role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className={styles.feedbackError} role="alert">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className={styles.previewCard}>
        <header className={styles.previewCardHeader}>
          <div>
            <h2>Photo preview</h2>
            <p>
              Your current photo stays unchanged until you save.
            </p>
          </div>

          <span className={styles.previewBadge}>
            <ImagePlus size={16} />
            Profile image
          </span>
        </header>

        <div className={styles.previewStage}>
          <button
            type="button"
            className={styles.photoFrame}
            onClick={() => {
              if (currentPhoto) {
                setModalOpen(true);
              }
            }}
            disabled={!currentPhoto}
            aria-label="View full profile photo"
          >
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={`${profile.name}'s profile`}
                className={styles.previewImage}
              />
            ) : (
              <span className={styles.previewFallback}>
                {profile.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            )}

            <span className={styles.photoHoverHint}>
              <ImagePlus size={20} />
              View photo
            </span>
          </button>

          <div className={styles.profileIdentity}>
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>

          {selectedFile && (
            <span className={styles.pendingBadge}>
              Unsaved changes
            </span>
          )}
        </div>

        <div className={styles.uploadSection}>
          <div className={styles.uploadInfo}>
            <div className={styles.uploadIcon}>
              <Camera size={23} />
            </div>

            <div>
              <h3>
                {selectedFile
                  ? "New photo selected"
                  : "Choose a new photo"}
              </h3>

              <p>
                {selectedFile
                  ? `${selectedFile.name} · ${(
                      selectedFile.size / 1024
                    ).toFixed(0)} KB`
                  : "JPG, PNG, or WEBP. Maximum file size: 5 MB."}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenInput}
            onChange={handleFileChange}
            disabled={saving}
          />

          <button
            type="button"
            className={styles.chooseButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            <Upload size={18} />
            <span>
              {selectedFile ? "Choose another" : "Choose photo"}
            </span>
          </button>
        </div>

        {selectedFile && (
          <div className={styles.actionSection}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.saveButton}
              onClick={() => void handleSaveChanges()}
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle
                  size={18}
                  className={styles.spinner}
                />
              ) : (
                <Save size={18} />
              )}

              <span>
                {saving ? "Saving Changes..." : "Save Changes"}
              </span>
            </button>
          </div>
        )}

        <div className={styles.privacyNote}>
          <ShieldCheck size={18} />
          <span>
            Selecting a photo only changes the local preview.
            Your saved profile photo changes only after you click Save
            Changes.
          </span>
        </div>
      </section>

      {/* Full image modal */}
      {modalOpen && currentPhoto && (
        <div
          className={styles.photoModalOverlay}
          onClick={() => setModalOpen(false)}
        >
          <section
            className={styles.photoModal}
            role="dialog"
            aria-modal="true"
            aria-label="Profile photo preview"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.photoModalHeader}>
              <div>
                <h2>
                  {selectedFile ? "New photo preview" : "Profile photo"}
                </h2>
                <p>{profile.name}</p>
              </div>

              <button
                type="button"
                className={styles.photoModalClose}
                onClick={() => setModalOpen(false)}
                aria-label="Close photo preview"
              >
                <X size={21} />
              </button>
            </header>

            <div className={styles.photoModalBody}>
              <img
                src={currentPhoto}
                alt={`${profile.name}'s full profile photo`}
                className={styles.photoModalImage}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoPreview;