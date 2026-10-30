
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth, type UserRole } from "../context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  department: string;
  level: string;
  location: string;
  bio: string;
  skills: string[];
  profilePicture?: {
    url?: string;
    publicId?: string;
  };
}

interface ProfileResponse {
  success: boolean;
  message?: string;
  user?: UserProfile;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

interface PictureUploadResponse {
  success: boolean;
  message?: string;
  profilePicture?: {
    url?: string;
    publicId?: string;
  };
}

const dashboardByRole: Record<UserRole, string> = {
  student: "/dashboard",
  technician: "/technician/dashboard",
  admin: "/admin/dashboard",
};

function Profile() {
  const {
    user,
    token,
    updateUser,
    isLoading: authLoading,
  } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load the authenticated user's profile from MongoDB.
  // IMPORTANT: This effect does not call updateUser().
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !token) {
      setProfile(null);
      setSavedProfile(null);
      setIsLoadingProfile(false);
      setError("Please sign in to view your profile.");
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: ProfileResponse = await response.json();

        if (!response.ok || !data.success || !data.user) {
          throw new Error(
            data.message || "Unable to load your profile.",
          );
        }

        if (!cancelled) {
          setProfile(data.user);
          setSavedProfile(data.user);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };

    // user?.id prevents profile-picture updates from triggering
    // another profile request.
  }, [user?.id, token, authLoading]);

  // Release temporary preview images when the preview changes or unmounts.
  useEffect(() => {
    if (!imagePreview) {
      return;
    }

    return () => {
      URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Update an editable profile field.
  const handleChange = (
    field:
      | "name"
      | "phone"
      | "department"
      | "level"
      | "location"
      | "bio",
    value: string,
  ) => {
    setProfile((current) =>
      current ? { ...current, [field]: value } : current,
    );

    setError("");
    setSuccess("");
  };

  // Upload the selected profile picture to Cloudinary through the backend.
  const handleProfilePictureUpload = async () => {
    if (!selectedImage || !token) {
      setError("Please select an image first.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedImage.type)) {
      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (selectedImage.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedImage);

    setIsUploadingImage(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/me/profile-picture`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data: PictureUploadResponse = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.profilePicture?.url
      ) {
        throw new Error(
          data.message || "Unable to upload your profile picture.",
        );
      }

      const updatedPicture = {
        url: data.profilePicture.url,
        publicId: data.profilePicture.publicId || "",
      };

      // Update the profile page.
      setProfile((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          profilePicture: updatedPicture,
        };
      });

      // Update the saved profile.
      setSavedProfile((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          profilePicture: updatedPicture,
        };
      });

      // Update AuthContext so the Navbar displays the new picture.
      if (user) {
        updateUser({
          ...user,
          profilePicture: updatedPicture,
        });
      }

      setSelectedImage(null);
      setImagePreview(null);

      setSuccess(
        data.message || "Profile picture updated successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload your profile picture.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save profile information to MongoDB.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile || !token) {
      setError("Your session is unavailable. Please sign in again.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          department: profile.department,
          level: profile.level,
          location: profile.location,
          bio: profile.bio,
        }),
      });

      const data: ProfileResponse = await response.json();

      if (!response.ok || !data.success || !data.user) {
        const validationMessage = data.errors
          ?.map((item) => item.message)
          .join(" ");

        throw new Error(
          validationMessage ||
            data.message ||
            "Unable to save your profile.",
        );
      }

      // Preserve the current picture if the profile response
      // does not include it.
      const updatedProfile: UserProfile = {
        ...data.user,
        profilePicture:
          data.user.profilePicture ?? profile.profilePicture,
      };

      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);

      // Synchronize the updated information with AuthContext.
      // This does not cause the profile-loading effect to repeat.
      updateUser({
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        role: updatedProfile.role,
        profilePicture: updatedProfile.profilePicture
          ? {
              url: updatedProfile.profilePicture.url || "",
              publicId:
                updatedProfile.profilePicture.publicId || "",
            }
          : undefined,
      });

      setSuccess(
        data.message || "Profile updated successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Restore the last saved profile values.
  const handleCancel = () => {
    if (savedProfile) {
      setProfile({ ...savedProfile });
    }

    setSelectedImage(null);
    setImagePreview(null);
    setError("");
    setSuccess("");
  };

  if (authLoading || isLoadingProfile) {
    return (
      <>
        <Navbar />

        <main className="profile-page">
          <div className="profile-container">
            <p role="status">Loading your profile...</p>
          </div>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar />

        <main className="profile-page">
          <div className="profile-container">
            <p role="alert">
              {error || "Your profile could not be loaded."}
            </p>

            <Link to="/login" className="button button-primary">
              Sign in
            </Link>
          </div>
        </main>
      </>
    );
  }

  const dashboardPath = dashboardByRole[profile.role];

  const displayedName =
    profile.name.trim().charAt(0).toUpperCase() || "?";

  const displayedRole =
    profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

  const displayedPicture =
    imagePreview || profile.profilePicture?.url || "";

  return (
    <>
      <Navbar />

      <main className="profile-page">
        <div className="profile-container">
          <header className="profile-header">
            <Link
              to={dashboardPath}
              className="profile-back-link"
            >
              ← Back to Dashboard
            </Link>

            <h1>My Profile</h1>

            <p>
              Manage your personal information and account details.
            </p>
          </header>

          <div className="profile-layout">
            <section className="profile-summary-card">
              <div className="profile-avatar">
                {displayedPicture ? (
                  <img
                    src={displayedPicture}
                    alt={`${profile.name}'s profile`}
                    className="profile-avatar-image"
                  />
                ) : (
                  <span>{displayedName}</span>
                )}
              </div>

              <div className="profile-picture-controls">
                <label htmlFor="profilePicture">
                  Profile picture
                </label>

                <input
                  id="profilePicture"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0] ?? null;

                    setSelectedImage(file);
                    setImagePreview(
                      file ? URL.createObjectURL(file) : null,
                    );

                    setError("");
                    setSuccess("");
                  }}
                  disabled={isUploadingImage}
                />

                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    void handleProfilePictureUpload();
                  }}
                  disabled={!selectedImage || isUploadingImage}
                >
                  {isUploadingImage
                    ? "Uploading..."
                    : "Upload Picture"}
                </button>
              </div>

              <h2>{profile.name}</h2>

              <p>{profile.email}</p>

              <span className="profile-account-type">
                {displayedRole}
              </span>

              {profile.department && (
                <p>{profile.department}</p>
              )}

              {profile.level && <p>{profile.level}</p>}

              {profile.location && (
                <p>{profile.location}</p>
              )}

              <p className="profile-summary-bio">
                {profile.bio ||
                  "Add a short biography about yourself."}
              </p>
            </section>

            <section className="profile-form-card">
              <h2>Personal Information</h2>

              <p>Update your information below.</p>

              {error && (
                <div
                  className="profile-message profile-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="profile-message profile-success"
                  role="status"
                >
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="profile-field">
                  <label htmlFor="fullName">
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    value={profile.name}
                    onChange={(event) =>
                      handleChange("name", event.target.value)
                    }
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="email">
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={profile.email}
                    readOnly
                    aria-describedby="email-note"
                  />

                  <small id="email-note">
                    Your email cannot be changed here.
                  </small>
                </div>

                <div className="profile-field">
                  <label htmlFor="phone">
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    value={profile.phone || ""}
                    onChange={(event) =>
                      handleChange("phone", event.target.value)
                    }
                    maxLength={20}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="accountType">
                    Account Type
                  </label>

                  <input
                    id="accountType"
                    type="text"
                    value={displayedRole}
                    readOnly
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="department">
                    Department
                  </label>

                  <input
                    id="department"
                    type="text"
                    value={profile.department || ""}
                    onChange={(event) =>
                      handleChange(
                        "department",
                        event.target.value,
                      )
                    }
                    maxLength={120}
                    placeholder="Enter your department"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="level">
                    Level
                  </label>

                  <input
                    id="level"
                    type="text"
                    value={profile.level || ""}
                    onChange={(event) =>
                      handleChange("level", event.target.value)
                    }
                    maxLength={30}
                    placeholder="e.g. 400 Level"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="location">
                    Location
                  </label>

                  <input
                    id="location"
                    type="text"
                    value={profile.location || ""}
                    onChange={(event) =>
                      handleChange(
                        "location",
                        event.target.value,
                      )
                    }
                    maxLength={120}
                    placeholder="Enter your location"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="bio">
                    About Me
                  </label>

                  <textarea
                    id="bio"
                    value={profile.bio || ""}
                    onChange={(event) =>
                      handleChange("bio", event.target.value)
                    }
                    maxLength={500}
                    rows={4}
                    placeholder="Tell us a little about yourself"
                  />
                </div>

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleCancel}
                    disabled={isSaving || isUploadingImage}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="profile-save-button"
                    disabled={isSaving || isUploadingImage}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

export default Profile