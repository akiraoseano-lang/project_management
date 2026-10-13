import { useEffect, useRef, useState } from "react";
import styles from "./Profile.module.css";

import {
    getProfile,
    updateProfile,
    uploadProfilePhoto,
} from "../../services/profile";

import type {
    UserProfile,
    UserProfileUpdate,
} from "../../types/profile";

const Profile = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const [form, setForm] = useState<UserProfileUpdate>({
        phone_number: "",
        bio: "",
        description: "",
        github_url: "",
        linkedin_url: "",
        instagram_url: "",
        website_url: "",
    });

    const [preview, setPreview] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await getProfile();

                setProfile(data);

                setForm({
                    phone_number: data.phone_number ?? "",
                    bio: data.bio ?? "",
                    description: data.description ?? "",
                    github_url: data.github_url ?? "",
                    linkedin_url: data.linkedin_url ?? "",
                    instagram_url: data.instagram_url ?? "",
                    website_url: data.website_url ?? "",
                });
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load profile"
                );
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setSuccess(null);
        setError(null);
    };

    const handleChoosePhoto = () => {
        fileInputRef.current?.click();
    };

    const handleSelectPhoto = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setError(null);
        setSuccess(null);

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError("Only JPG, PNG, and WEBP images are allowed.");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        const maxSize = 5 * 1024 * 1024;

        if (file.size > maxSize) {
            setError("Profile photo must be smaller than 5 MB.");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        const previewUrl = URL.createObjectURL(file);

        setPreview(previewUrl);

        try {
            setUploading(true);

            const updatedProfile = await uploadProfilePhoto(file);

            setProfile(updatedProfile);

            setSuccess("Profile photo updated successfully.");
        } catch (err) {
            setPreview(null);

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to upload profile photo"
            );
        } finally {
            setUploading(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError(null);
        setSuccess(null);

        try {
            setSaving(true);

            const updatedProfile = await updateProfile(form);

            setProfile(updatedProfile);

            setForm({
                phone_number: updatedProfile.phone_number ?? "",
                bio: updatedProfile.bio ?? "",
                description: updatedProfile.description ?? "",
                github_url: updatedProfile.github_url ?? "",
                linkedin_url: updatedProfile.linkedin_url ?? "",
                instagram_url: updatedProfile.instagram_url ?? "",
                website_url: updatedProfile.website_url ?? "",
            });

            setSuccess("Profile updated successfully.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update profile"
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className={styles.page}>
                <div className={styles.loading}>
                    Loading profile...
                </div>
            </main>
        );
    }

    if (!profile) {
        return (
            <main className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.error}>
                        {error || "Profile not found"}
                    </div>
                </div>
            </main>
        );
    }

    const profilePhoto = preview || profile.profile_photo_signed_url;

    return (
        <main className={styles.page}>
            <div className={styles.container}>

                <div className={styles.header}>
                    <div>
                        <h1>Profile</h1>
                        <p>
                            Manage your profile information and social links.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                {success && (
                    <div className={styles.success}>
                        {success}
                    </div>
                )}

                <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                >

                    <section className={styles.card}>
                        <div className={styles.sectionHeader}>
                            <h2>Profile Photo</h2>
                            <p>
                                Choose a photo to represent your profile.
                            </p>
                        </div>

                        <div className={styles.photoSection}>

                            <div className={styles.photoWrapper}>
                                {profilePhoto ? (
                                    <img
                                        src={profilePhoto}
                                        alt={`${profile.name} profile`}
                                        className={styles.photo}
                                    />
                                ) : (
                                    <div className={styles.placeholder}>
                                        {profile.name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                )}

                                {uploading && (
                                    <div className={styles.uploadOverlay}>
                                        Uploading...
                                    </div>
                                )}
                            </div>

                            <div className={styles.photoInfo}>
                                <h3>{profile.name}</h3>

                                <p>{profile.email}</p>

                                <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={handleChoosePhoto}
                                    disabled={uploading}
                                >
                                    {uploading
                                        ? "Uploading..."
                                        : "Change Photo"}
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleSelectPhoto}
                                    hidden
                                />

                                <span className={styles.photoHint}>
                                    JPG, PNG, or WEBP · Max 5 MB
                                </span>
                            </div>

                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.sectionHeader}>
                            <h2>Basic Information</h2>
                            <p>
                                Update your personal profile information.
                            </p>
                        </div>

                        <div className={styles.grid}>

                            <div className={styles.field}>
                                <label htmlFor="name">
                                    Name
                                </label>

                                <input
                                    id="name"
                                    type="text"
                                    value={profile.name}
                                    disabled
                                />

                                <span className={styles.hint}>
                                    Your name is managed through your account.
                                </span>
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="email">
                                    Email
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    value={profile.email}
                                    disabled
                                />

                                <span className={styles.hint}>
                                    Your email is managed through your account.
                                </span>
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="phone_number">
                                    Phone Number
                                </label>

                                <input
                                    id="phone_number"
                                    name="phone_number"
                                    type="tel"
                                    value={form.phone_number ?? ""}
                                    onChange={handleChange}
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="bio">
                                    Bio
                                </label>

                                <input
                                    id="bio"
                                    name="bio"
                                    type="text"
                                    maxLength={500}
                                    value={form.bio ?? ""}
                                    onChange={handleChange}
                                    placeholder="e.g. Software Engineer"
                                />
                            </div>

                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.sectionHeader}>
                            <h2>About</h2>
                            <p>
                                Tell others about your specialization and
                                experience.
                            </p>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="description">
                                Description
                            </label>

                            <textarea
                                id="description"
                                name="description"
                                rows={6}
                                value={form.description ?? ""}
                                onChange={handleChange}
                                placeholder="Describe your specialization, experience, interests, or the type of work you do..."
                            />
                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.sectionHeader}>
                            <h2>Social Links</h2>
                            <p>
                                Add links to your social profiles and website.
                                All fields are optional.
                            </p>
                        </div>

                        <div className={styles.grid}>

                            <div className={styles.field}>
                                <label htmlFor="github_url">
                                    GitHub
                                </label>

                                <input
                                    id="github_url"
                                    name="github_url"
                                    type="url"
                                    value={form.github_url ?? ""}
                                    onChange={handleChange}
                                    placeholder="https://github.com/username"
                                />
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="linkedin_url">
                                    LinkedIn
                                </label>

                                <input
                                    id="linkedin_url"
                                    name="linkedin_url"
                                    type="url"
                                    value={form.linkedin_url ?? ""}
                                    onChange={handleChange}
                                    placeholder="https://linkedin.com/in/username"
                                />
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="instagram_url">
                                    Instagram
                                </label>

                                <input
                                    id="instagram_url"
                                    name="instagram_url"
                                    type="url"
                                    value={form.instagram_url ?? ""}
                                    onChange={handleChange}
                                    placeholder="https://instagram.com/username"
                                />
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="website_url">
                                    Website
                                </label>

                                <input
                                    id="website_url"
                                    name="website_url"
                                    type="url"
                                    value={form.website_url ?? ""}
                                    onChange={handleChange}
                                    placeholder="https://example.com"
                                />
                            </div>

                        </div>
                    </section>

                    <div className={styles.actions}>
                        <button
                            type="submit"
                            className={styles.saveButton}
                            disabled={saving || uploading}
                        >
                            {saving
                                ? "Saving..."
                                : "Save Changes"}
                        </button>
                    </div>

                </form>

            </div>
        </main>
    );
};

export default Profile;