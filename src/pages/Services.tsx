
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import type { ServiceListing } from "../utils/storage";
import { SERVICE_CATEGORIES } from "../constants/serviceOptions";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SortOption = "newest" | "oldest" | "price-low" | "price-high";
type ViewOption = "grid" | "list";

interface ServicesResponse {
  services?: ServiceListing[];
  data?: ServiceListing[];
  message?: string;
  success?: boolean;
}

function formatServicePrice(service: ServiceListing): string {
  if (service.pricingModel === "Price on Request") {
    return "Price on request";
  }

  if (service.price === null || service.price === undefined) {
    return "Contact for price";
  }

  const formattedPrice = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(service.price);

  return service.pricingModel === "Hourly Rate"
    ? `${formattedPrice} / hour`
    : formattedPrice;
}

function Services() {
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Services");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewOption>("grid");

  const [selectedService, setSelectedService] =
    useState<ServiceListing | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Normalize service records received from the backend.
  function normalizeServices(
    returnedServices: ServiceListing[],
  ): ServiceListing[] {
    return returnedServices.map((service) => ({
      ...service,
      id: String(service.id),
      title: service.title ?? "",
      category: service.category ?? "",
      description: service.description ?? "",
      pricingModel: service.pricingModel,
      price:
        service.price === null || service.price === undefined
          ? null
          : Number(service.price),
      location: service.location ?? "",
      contactMethod: service.contactMethod ?? "Phone",
      contactValue: service.contactValue ?? "",
      image: service.image ?? "",
      createdAt: service.createdAt ?? "",
    }));
  }

  // Load services from the backend.
  useEffect(() => {
    const controller = new AbortController();

    async function loadServices() {
      try {
        setIsLoading(true);
        setLoadError("");

        const response = await fetch(`${API_BASE_URL}/services`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const result = (await response.json()) as ServicesResponse;

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load available services.",
          );
        }

        const returnedServices = Array.isArray(result.services)
          ? result.services
          : Array.isArray(result.data)
            ? result.data
            : null;

        if (!returnedServices) {
          throw new Error(
            "The server returned an unexpected services response.",
          );
        }

        setServices(normalizeServices(returnedServices));
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load services. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      controller.abort();
    };
  }, []);

  // Use the shared service categories across the application.
  const categories = useMemo(
    () => ["All Services", ...SERVICE_CATEGORIES],
    [],
  );

  // Reset the selected category if it no longer exists.
  useEffect(() => {
    if (
      category !== "All Services" &&
      !categories.includes(category)
    ) {
      setCategory("All Services");
    }
  }, [category, categories]);

  // Close the service modal when Escape is pressed.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedService(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Search, filter, and sort the services.
  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = services.filter((service) => {
      const searchableFields = [
        service.title,
        service.category,
        service.description,
        service.location,
      ];

      const matchesSearch =
        !query ||
        searchableFields.join(" ").toLowerCase().includes(query);

      const matchesCategory =
        category === "All Services" ||
        service.category === category;

      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      const safeDateA = Number.isNaN(dateA) ? 0 : dateA;
      const safeDateB = Number.isNaN(dateB) ? 0 : dateB;

      if (sortBy === "oldest") {
        return safeDateA - safeDateB;
      }

      if (sortBy === "price-low") {
        const priceA = a.price ?? Number.MAX_SAFE_INTEGER;
        const priceB = b.price ?? Number.MAX_SAFE_INTEGER;

        return priceA - priceB;
      }

      if (sortBy === "price-high") {
        const priceA = a.price ?? -1;
        const priceB = b.price ?? -1;

        return priceB - priceA;
      }

      return safeDateB - safeDateA;
    });
  }, [services, search, category, sortBy]);

  // Create the correct contact URL for each service.
  function getContactUrl(service: ServiceListing): string {
    const value = service.contactValue?.trim() || "";

    if (service.contactMethod === "Email") {
      return `mailto:${value}`;
    }

    if (service.contactMethod === "WhatsApp") {
      const number = value.replace(/\D/g, "");

      return `https://wa.me/${number}`;
    }

    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }

  // Reload services when the user clicks Try Again.
  async function handleRetry() {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${API_BASE_URL}/services`, {
        headers: {
          Accept: "application/json",
        },
      });

      const result = (await response.json()) as ServicesResponse;

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load available services.",
        );
      }

      const returnedServices = Array.isArray(result.services)
        ? result.services
        : Array.isArray(result.data)
          ? result.data
          : null;

      if (!returnedServices) {
        throw new Error(
          "The server returned an unexpected services response.",
        );
      }

      setServices(normalizeServices(returnedServices));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load services. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="tech-page">
        {/* Hero */}
        <section className="tech-hero">
          <div className="tech-container tech-hero-layout">
            <div className="tech-hero-copy">
              <span className="tech-eyebrow">
                CAMPUS TECHNOLOGY HUB
              </span>

              <h1>
                Find the right
                <br />
                <span>technical support.</span>
              </h1>

              <p>
                Discover skilled students and service providers
                offering technical and creative services within
                your campus community.
              </p>

              <div className="tech-hero-actions">
                <a
                  href="#service-directory"
                  className="tech-button tech-primary"
                >
                  Explore services <span>→</span>
                </a>

                <Link
                  to="/services/create"
                  className="tech-button tech-secondary"
                >
                  + Offer a service
                </Link>
              </div>

              <div className="tech-trust-row">
                <span>
                  <i>✓</i> Campus-focused
                </span>

                <span>
                  <i>✓</i> Direct contact
                </span>

                <span>
                  <i>✓</i> Skilled providers
                </span>
              </div>
            </div>

            <div className="tech-hero-card">
              <div className="tech-hero-card-icon">✳</div>

              <span className="tech-card-kicker">
                CAMPUS CONNECTIONS
              </span>

              <h2>Skills meet opportunity.</h2>

              <p>
                Find help, discover expertise, and connect with
                people who have skills worth sharing.
              </p>

              <div className="tech-hero-metrics">
                <div>
                  <strong>
                    {isLoading ? "..." : services.length}
                  </strong>

                  <span>Listed services</span>
                </div>

                <div>
                  <strong>Campus</strong>
                  <span>Community focus</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services directory */}
        <section
          id="service-directory"
          className="tech-directory tech-container"
        >
          <div className="tech-directory-heading">
            <div>
              <span className="tech-eyebrow">
                DISCOVER EXPERTISE
              </span>

              <h2>Services directory</h2>

              <p>
                Browse available services and find the support
                you need.
              </p>
            </div>

            <Link
              to="/services/create"
              className="tech-button tech-primary"
            >
              + Create a service
            </Link>
          </div>

          {/* Search and filters */}
          <div className="tech-filter-panel">
            <label className="tech-search-field">
              <span>⌕</span>

              <input
                type="search"
                placeholder="Search services, skills or location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search services"
              />
            </label>

            <label className="tech-select-field">
              <span>Category</span>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="tech-select-field">
              <span>Sort by</span>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as SortOption)
                }
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price-low">
                  Price: low to high
                </option>
                <option value="price-high">
                  Price: high to low
                </option>
              </select>
            </label>
          </div>

          {/* Results toolbar */}
          <div className="tech-results-toolbar">
            <p>
              <strong>
                {isLoading ? "..." : filteredServices.length}
              </strong>{" "}
              {filteredServices.length === 1
                ? "service"
                : "services"}{" "}
              found
            </p>

            <div
              className="tech-view-switch"
              aria-label="Listing layout"
            >
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                ▦
              </button>

              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div
              className="tech-empty-state"
              role="status"
              aria-live="polite"
            >
              <div className="tech-empty-icon">↻</div>

              <h3>Loading services...</h3>

              <p>
                Please wait while we retrieve available services.
              </p>
            </div>
          )}

          {/* Error state */}
          {!isLoading && loadError && (
            <div className="tech-empty-state" role="alert">
              <div className="tech-empty-icon">!</div>

              <h3>We couldn't load the services</h3>

              <p>{loadError}</p>

              <button
                type="button"
                className="tech-button tech-primary"
                onClick={() => void handleRetry()}
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading &&
            !loadError &&
            filteredServices.length === 0 && (
              <div className="tech-empty-state">
                <div className="tech-empty-icon">⌕</div>

                <h3>
                  {services.length === 0
                    ? "Be the first to offer a service"
                    : "No services match your search"}
                </h3>

                <p>
                  {services.length === 0
                    ? "Share your skills with the campus community by publishing your first service."
                    : "Try another keyword or change your category filters."}
                </p>

                {services.length === 0 ? (
                  <Link
                    to="/services/create"
                    className="tech-button tech-primary"
                  >
                    Create your first service
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="tech-button tech-secondary"
                    onClick={() => {
                      setSearch("");
                      setCategory("All Services");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

          {/* Service cards */}
          {!isLoading &&
            !loadError &&
            filteredServices.length > 0 && (
              <div
                className={`tech-service-grid ${
                  view === "list" ? "list-view" : ""
                }`}
              >
                {filteredServices.map((service) => (
                  <article
                    className="tech-service-card"
                    key={service.id}
                  >
                    <button
                      type="button"
                      className="tech-service-image"
                      onClick={() => setSelectedService(service)}
                      aria-label={`View ${service.title}`}
                    >
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.title}
                          loading="lazy"
                        />
                      ) : (
                        <span className="tech-image-placeholder">
                          ✳
                        </span>
                      )}

                      <span className="tech-category-badge">
                        {service.category}
                      </span>
                    </button>

                    <div className="tech-service-content">
                      <span className="tech-service-kicker">
                        CAMPUS SERVICE
                      </span>

                      <h3>{service.title}</h3>

                      <p className="tech-service-description">
                        {service.description}
                      </p>

                      <div className="tech-service-location">
                        <span>⌖</span>
                        {service.location}
                      </div>

                      <div className="tech-service-card-footer">
                        <div className="tech-service-price">
                          <strong>
                            {formatServicePrice(service)}
                          </strong>

                          {service.pricingModel === "Hourly Rate" && (
                            <span>Hourly pricing</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="tech-view-details"
                          onClick={() => setSelectedService(service)}
                        >
                          Details <span>→</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </section>

        {/* Bottom call to action */}
        <section className="tech-bottom-cta">
          <div className="tech-container tech-bottom-cta-inner">
            <div>
              <span className="tech-eyebrow">
                GROW YOUR REACH
              </span>

              <h2>Your skills deserve to be discovered.</h2>

              <p>
                Create a listing and connect with people who need
                what you do.
              </p>
            </div>

            <Link
              to="/services/create"
              className="tech-button tech-primary"
            >
              Publish your service <span>→</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Service details modal */}
      {selectedService && (
        <div
          className="tech-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedService(null);
            }
          }}
        >
          <section
            className="tech-service-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tech-modal-title"
          >
            <button
              type="button"
              className="tech-modal-close"
              onClick={() => setSelectedService(null)}
              aria-label="Close service details"
            >
              ×
            </button>

            <div className="tech-modal-image">
              {selectedService.image ? (
                <img
                  src={selectedService.image}
                  alt={selectedService.title}
                />
              ) : (
                <span>✳</span>
              )}
            </div>

            <span className="tech-eyebrow">
              {selectedService.category}
            </span>

            <h2 id="tech-modal-title">
              {selectedService.title}
            </h2>

            <p className="tech-modal-description">
              {selectedService.description}
            </p>

            <div className="tech-modal-information">
              <div>
                <span>Price</span>

                <strong>
                  {formatServicePrice(selectedService)}
                </strong>
              </div>

              <div>
                <span>Location</span>

                <strong>{selectedService.location}</strong>
              </div>

              <div>
                <span>Contact method</span>

                <strong>
                  {selectedService.contactMethod}
                </strong>
              </div>

              <div>
                <span>Contact details</span>

                <strong>
                  {selectedService.contactValue || "Not provided"}
                </strong>
              </div>
            </div>

            {/* Contact technician */}
            {selectedService.contactValue?.trim() ? (
              <a
                className="tech-button tech-primary tech-contact-button"
                href={getContactUrl(selectedService)}
                target={
                  selectedService.contactMethod === "WhatsApp"
                    ? "_blank"
                    : undefined
                }
                rel={
                  selectedService.contactMethod === "WhatsApp"
                    ? "noopener noreferrer"
                    : undefined
                }
              >
                {selectedService.contactMethod === "WhatsApp"
                  ? "Chat on WhatsApp"
                  : selectedService.contactMethod === "Email"
                    ? "Send an Email"
                    : "Call Technician"}

                <span>→</span>
              </a>
            ) : (
              <p className="tech-contact-unavailable">
                Contact information is currently unavailable.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default Services