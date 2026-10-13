export interface UserProfile {
    user_id: number;
    name: string;
    email: string;

    profile_photo_url: string | null;
    profile_photo_signed_url: string | null;
    phone_number: string | null;
    bio: string | null;
    description: string | null;

    github_url: string | null;
    linkedin_url: string | null;
    instagram_url: string | null;
    website_url: string | null;
}

export interface UserProfileUpdate {
    profile_photo_url?: string | null;
    phone_number?: string | null;
    bio?: string | null;
    description?: string | null;

    github_url?: string | null;
    linkedin_url?: string | null;
    instagram_url?: string | null;
    website_url?: string | null;
}

export interface ProfilePhotoUploadResponse {
    path: string;
    token: string;
    signed_url: string;
}