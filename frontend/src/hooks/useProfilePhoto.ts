import { useCallback, useEffect, useState } from "react";
import { getProfile } from "../services/profile";

const PROFILE_PHOTO_UPDATED = "profile-photo-updated";

export function useProfilePhoto() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const refreshPhoto = useCallback(async () => {
    try {
      const profile = await getProfile();

      setPhotoUrl(profile.profile_photo_signed_url ?? null);
      setPhotoFailed(false);
    } catch (error) {
      console.error("Gagal mengambil foto profil:", error);
    }
  }, []);

  useEffect(() => {
    void refreshPhoto();

    const handlePhotoUpdated = () => {
      void refreshPhoto();
    };

    window.addEventListener(PROFILE_PHOTO_UPDATED, handlePhotoUpdated);

    return () => {
      window.removeEventListener(
        PROFILE_PHOTO_UPDATED,
        handlePhotoUpdated,
      );
    };
  }, [refreshPhoto]);

  return {
    photoUrl,
    photoFailed,
    setPhotoFailed,
    refreshPhoto,
  };
}

export function notifyProfilePhotoUpdated() {
  window.dispatchEvent(new Event(PROFILE_PHOTO_UPDATED));
}