import { api } from "../api/client";

import type {
    UserProfile,
    UserProfileUpdate,
    ProfilePhotoUploadResponse
} from "../types/profile";

export const getProfile = async (): Promise<UserProfile> => {
    return api<UserProfile>("/users/me");
};

export const updateProfile = async (
    data: UserProfileUpdate
): Promise<UserProfile> => {
    return api<UserProfile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(data)
    });
};

export const getProfilePhotoUploadUrl = async (): Promise<ProfilePhotoUploadResponse> => {
    return api<ProfilePhotoUploadResponse>(
        "/users/me/profile-photo/upload-url",
        {
            method: "POST",
        }
    );
};

export const uploadProfilePhoto = async (
    file: File
): Promise<UserProfile> => {
    const uploadData = await getProfilePhotoUploadUrl();

    const response = await fetch(uploadData.signed_url, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    if (!response.ok) {
        throw new Error("Failed to upload profile photo");
    }

    return updateProfile({
        profile_photo_url: uploadData.path
    })
};
