
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  Globe,
  LoaderCircle,
  Save,
  UserRound,
  XCircle,
} from "lucide-react";

import { getProfile, updateProfile } from "../../services/profile";
import type { UserProfile, UserProfileUpdate } from "../../types/profile";
import styles from "./Profile.module.css";

const emptyForm: UserProfileUpdate = {
  phone_number: "",
  bio: "",
  description: "",
  github_url: "",
  linkedin_url: "",
  instagram_url: "",
  website_url: "",
};

type SocialIconProps = {
  size?: number;
};

const GitHubIcon = ({ size = 17 }: SocialIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="GitHub"
    role="img"
  >
    <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.1c-3.1.67-3.75-1.32-3.75-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.75 2.08 3.3 1.55.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.51 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.28-2.61 5.22-5.1 5.5.4.35.75 1.02.75 2.06v3.06c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
  </svg>
);

const InstagramIcon = ({ size = 17 }: SocialIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Instagram"
    role="img"
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedInIcon = ({ size = 17 }: SocialIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="LinkedIn"
    role="img"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1-.001-4.124 2.062 2.062 0 0 1 .001 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const socialLinks = [
  {
    label: "GitHub",
    name: "github_url",
    placeholder: "https://github.com/username",
    icon: GitHubIcon,
  },
  {
    label: "LinkedIn",
    name: "linkedin_url",
    placeholder: "https://linkedin.com/in/username",
    icon: LinkedInIcon,
  },
  {
    label: "Instagram",
    name: "instagram_url",
    placeholder: "https://instagram.com/username",
    icon: InstagramIcon,
  },
  {
    label: "Website",
    name: "website_url",
    placeholder: "https://example.com",
    icon: Globe,
  },
] as const;

const Profile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfileUpdate>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
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
    } catch {
      setError("Failed to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSuccess("");
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
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

      setSuccess("Your profile has been updated successfully.");
    } catch {
      setError("Failed to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <LoaderCircle size={28} className={styles.spinner} />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.profilePage}>
        <div className={styles.feedbackError}>
          <XCircle size={18} />
          <span>{error || "Your profile could not be loaded."}</span>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => void loadProfile()}
        >
          Try again
        </button>
      </div>
    );
  }

  const avatarUrl = profile.profile_photo_signed_url;

  return (
    <div className={styles.profilePage}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PERSONAL SETTINGS</span>
          <h1>My Profile</h1>
          <p>Manage your personal information and social links.</p>
        </div>
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

      <form onSubmit={handleSubmit} className={styles.profileForm}>
        <section className={styles.identityCard}>
          <div className={styles.identityMain}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => navigate("/profile/photo")}
              aria-label="Preview and change profile photo"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${profile.name}'s profile`}
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.avatarFallback}>
                  {profile.name?.charAt(0)?.toUpperCase() || (
                    <UserRound size={34} />
                  )}
                </span>
              )}

              <span className={styles.avatarOverlay}>
                <Camera size={19} />
              </span>
            </button>

            <div className={styles.identityText}>
              <h2>{profile.name}</h2>
              <p>{profile.email}</p>
              <span className={styles.roleBadge}>
                {profile.role || "Member"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigate("/profile/photo")}
          >
            <Camera size={16} />
            <span>View Photo</span>
          </button>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <UserRound size={19} />
            </div>
            <div>
              <h2>Basic Information</h2>
              <p>Your account identity and contact details.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                value={profile.name}
                disabled
                className={styles.input}
              />
              <span className={styles.fieldHint}>
                Your name is managed by your account settings.
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="profile-email">Email Address</label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                disabled
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="profile-phone">Phone Number</label>
              <input
                id="profile-phone"
                name="phone_number"
                type="tel"
                value={form.phone_number ?? ""}
                onChange={handleChange}
                placeholder="+62 812 3456 7890"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="profile-bio">Professional Headline</label>
              <input
                id="profile-bio"
                name="bio"
                value={form.bio ?? ""}
                onChange={handleChange}
                placeholder="e.g. Computer Science Student"
                className={styles.input}
              />
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <UserRound size={19} />
            </div>
            <div>
              <h2>About Me</h2>
              <p>Tell your teammates a little about yourself.</p>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="profile-description">Description</label>
            <textarea
              id="profile-description"
              name="description"
              value={form.description ?? ""}
              onChange={handleChange}
              placeholder="Write a short introduction about yourself..."
              rows={5}
              className={styles.textarea}
            />
            <span className={styles.fieldHint}>
              Share your interests, skills, or what you are working on.
            </span>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Globe size={19} />
            </div>
            <div>
              <h2>Social Links</h2>
              <p>Connect your profile to your online presence.</p>
            </div>
          </div>

          <div className={styles.socialGrid}>
            {socialLinks.map(({ label, name, placeholder, icon: Icon }) => (
              <div className={styles.field} key={name}>
                <label htmlFor={`profile-${name}`}>{label}</label>

                <div className={styles.inputWithIcon}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <Icon size={17} />
                  </span>

                  <input
                    id={`profile-${name}`}
                    name={name}
                    type="url"
                    value={form[name] ?? ""}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={styles.input}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.formFooter}>
          <p className={styles.footerNote}>
            Your changes will be saved to your profile.
          </p>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle size={17} className={styles.spinner} />
            ) : (
              <Save size={17} />
            )}
            <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
          </button>
        </footer>
      </form>
    </div>
  );
};

export default Profile;
