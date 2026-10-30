
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

import {
  SERVICE_CATEGORIES,
  SERVICE_PRICING_MODELS,
  SERVICE_CONTACT_METHODS,
  type ServicePricingModel,
  type ServiceContactMethod,
} from "../constants/serviceOptions";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function CreateService() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(
    SERVICE_CATEGORIES[0],
  );
  const [description, setDescription] = useState("");

  const [pricingModel, setPricingModel] =
    useState<ServicePricingModel>("Fixed Price");

  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");

  const [contactMethod, setContactMethod] =
    useState<ServiceContactMethod>("Phone");

  const [contactValue, setContactValue] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clean up temporary image previews.
  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle service image selection.
  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must not exceed 2MB.");
      event.target.value = "";
      return;
    }

    setError("");

    const previewUrl = URL.createObjectURL(file);

    setImage(file);

    setImagePreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return previewUrl;
    });
  }

  // Remove the selected image.
  function removeImage() {
    setImage(null);
    setImagePreview("");

    const fileInput = document.getElementById(
      "service-image",
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  // Publish a service to the backend.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (isSubmitting) {
      return;
    }

    // Require authentication.
    if (!token || !user) {
      setError("Please log in before publishing a service.");
      return;
    }

    // Only technicians can publish services.
    if (user.role !== "technician") {
      setError("Only technician accounts can publish services.");
      return;
    }

    // Validate required fields.
    if (
      !title.trim() ||
      !description.trim() ||
      !location.trim() ||
      !contactValue.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    // Validate the service price.
    let numericPrice: number | null = null;

    if (pricingModel !== "Price on Request") {
      numericPrice = Number(price);

      if (
        !price.trim() ||
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0
      ) {
        setError("Please enter a valid price greater than zero.");
        return;
      }
    }

    // Validate WhatsApp numbers.
    if (
      contactMethod === "WhatsApp" &&
      contactValue.replace(/\D/g, "").length < 7
    ) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    // Validate email addresses.
    if (
      contactMethod === "Email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue.trim())
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      formData.append("title", title.trim());
      formData.append("category", category);
      formData.append("description", description.trim());
      formData.append("pricingModel", pricingModel);

      formData.append(
        "price",
        numericPrice === null ? "" : String(numericPrice),
      );

      formData.append("location", location.trim());
      formData.append("contactMethod", contactMethod);
      formData.append("contactValue", contactValue.trim());

      // Send the actual image file to the backend.
      if (image) {
        formData.append("image", image);
      }

      const response = await fetch(`${API_BASE_URL}/services`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // Handle responses that are not valid JSON.
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            (Array.isArray(data.errors)
              ? data.errors.join(" ")
              : "") ||
            "Unable to publish your service.",
        );
      }

      setSuccess("Your service has been published successfully!");

      // Return to the services directory after success.
      window.setTimeout(() => {
        navigate("/services");
      }, 900);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to publish your service. Please try again.",
      );

      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="create-service-page">
        <div className="create-service-container">
          <Link to="/services" className="create-service-back">
            ← Back to services
          </Link>

          <header className="create-service-header">
            <span className="section-kicker">
              TECHNICIAN SERVICES
            </span>

            <h1>Showcase your skills.</h1>

            <p>
              Publish your service and connect with students who
              need your technical expertise.
            </p>
          </header>

          <div className="create-service-layout">
            <form
              className="create-service-form"
              onSubmit={handleSubmit}
            >
              {error && (
                <div
                  className="create-service-message error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="create-service-message success"
                  role="status"
                >
                  {success}
                </div>
              )}

              {/* Service information */}
              <section className="create-service-section">
                <h2>Service information</h2>

                <p>
                  Tell students what you can help them with.
                </p>

                <div className="create-service-field">
                  <label htmlFor="service-title">
                    Service title *
                  </label>

                  <input
                    id="service-title"
                    type="text"
                    placeholder="e.g. iPhone screen replacement"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    maxLength={100}
                    required
                  />
                </div>

                <div className="create-service-field">
                  <label htmlFor="service-category">
                    Category *
                  </label>

                  <select
                    id="service-category"
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value)
                    }
                    required
                  >
                    {SERVICE_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="create-service-field">
                  <label htmlFor="service-description">
                    Description *
                  </label>

                  <textarea
                    id="service-description"
                    placeholder="Describe your skills, the services you offer, and what customers should expect..."
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    rows={5}
                    maxLength={1500}
                    required
                  />

                  <small>
                    {description.length}/1500 characters
                  </small>
                </div>
              </section>

              {/* Pricing */}
              <section className="create-service-section">
                <h2>Pricing</h2>

                <p>
                  Choose how you want to charge for your service.
                </p>

                <div className="create-service-field">
                  <label htmlFor="pricing-model">
                    Pricing model *
                  </label>

                  <select
                    id="pricing-model"
                    value={pricingModel}
                    onChange={(event) => {
                      setPricingModel(
                        event.target.value as ServicePricingModel,
                      );

                      setPrice("");
                    }}
                  >
                    {SERVICE_PRICING_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                {pricingModel !== "Price on Request" && (
                  <div className="create-service-field">
                    <label htmlFor="service-price">
                      {pricingModel === "Hourly Rate"
                        ? "Hourly rate (₦) *"
                        : "Service price (₦) *"}
                    </label>

                    <input
                      id="service-price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={price}
                      onChange={(event) =>
                        setPrice(event.target.value)
                      }
                      required
                    />
                  </div>
                )}
              </section>

              {/* Location and contact */}
              <section className="create-service-section">
                <h2>Location and contact</h2>

                <p>
                  Help customers know where and how to reach you.
                </p>

                <div className="create-service-field">
                  <label htmlFor="service-location">
                    Service location *
                  </label>

                  <input
                    id="service-location"
                    type="text"
                    placeholder="e.g. Tanke, University of Ilorin"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    maxLength={150}
                    required
                  />
                </div>

                <div className="create-service-field">
                  <label htmlFor="contact-method">
                    Preferred contact method *
                  </label>

                  <select
                    id="contact-method"
                    value={contactMethod}
                    onChange={(event) =>
                      setContactMethod(
                        event.target.value as ServiceContactMethod,
                      )
                    }
                  >
                    {SERVICE_CONTACT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="create-service-field">
                  <label htmlFor="contact-value">
                    {contactMethod === "Email"
                      ? "Email address *"
                      : contactMethod === "WhatsApp"
                        ? "WhatsApp number *"
                        : "Phone number *"}
                  </label>

                  <input
                    id="contact-value"
                    type={
                      contactMethod === "Email" ? "email" : "text"
                    }
                    placeholder={
                      contactMethod === "Email"
                        ? "you@example.com"
                        : contactMethod === "WhatsApp"
                          ? "Include your country code, e.g. 2348012345678"
                          : "Enter your contact number"
                    }
                    value={contactValue}
                    onChange={(event) =>
                      setContactValue(event.target.value)
                    }
                    maxLength={150}
                    required
                  />
                </div>
              </section>

              {/* Service image */}
              <section className="create-service-section">
                <h2>Service image</h2>

                <p>
                  Optional: add an image representing your service.
                </p>

                <label
                  className="create-service-upload"
                  htmlFor="service-image"
                >
                  <span className="create-service-upload-icon">
                    ＋
                  </span>

                  <strong>
                    {image
                      ? "Choose another image"
                      : "Upload an image"}
                  </strong>

                  <span>
                    PNG, JPG or another image format · Max 2MB
                  </span>

                  <input
                    id="service-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>

                {imagePreview && (
                  <div className="create-service-preview">
                    <img
                      src={imagePreview}
                      alt="Service preview"
                    />

                    <div>
                      <strong>{image?.name}</strong>

                      <button
                        type="button"
                        onClick={removeImage}
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Form actions */}
              <div className="create-service-actions">
                <Link
                  to="/services"
                  className="create-service-cancel"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="create-service-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Publishing..."
                    : "Publish service →"}
                </button>
              </div>
            </form>

            {/* Sidebar */}
            <aside className="create-service-sidebar">
              <div className="create-service-tip">
                <span className="create-service-tip-icon">
                  ✦
                </span>

                <h3>Make your service stand out</h3>

                <p>
                  A clear title and detailed description help
                  students understand what you offer.
                </p>
              </div>

              <div className="create-service-checklist">
                <h3>Before you publish</h3>

                <ul>
                  <li>✓ Use a clear service title</li>
                  <li>✓ Explain your skills honestly</li>
                  <li>✓ Set a reasonable price</li>
                  <li>✓ Provide accurate contact details</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

export default CreateService;

