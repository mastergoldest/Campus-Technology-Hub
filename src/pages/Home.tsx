
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ApiProduct {
  _id: string;
  name: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  image?: string | { url?: string } | null;
  createdAt?: string;
}

interface ApiService {
  _id: string;
  title: string;
  category: string;
  description: string;
  image?: string | { url?: string } | null;
  createdAt?: string;
}

interface ProductsResponse {
  success?: boolean;
  products?: ApiProduct[];
  data?: ApiProduct[];
  pagination?: { totalPages?: number };
  message?: string;
}

interface ServicesResponse {
  success?: boolean;
  services?: ApiService[];
  data?: ApiService[];
  message?: string;
}

function getImageUrl(image: ApiProduct["image"] | ApiService["image"]) {
  if (typeof image === "string") return image;
  return image?.url || "";
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);
}

function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  const dashboardPath =
    user?.role === "student"
      ? "/dashboard"
      : user?.role === "technician"
        ? "/technician/dashboard"
        : user?.role === "admin"
          ? "/admin/dashboard"
          : "/";

  const [featuredProducts, setFeaturedProducts] = useState<ApiProduct[]>([]);
  const [featuredServices, setFeaturedServices] = useState<ApiService[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [servicesError, setServicesError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setProductsLoading(true);
      setProductsError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/products?page=1&limit=3`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as ProductsResponse;

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Could not load marketplace listings.",
          );
        }

        const products = result.products ?? result.data ?? [];
        setFeaturedProducts(products.slice(0, 3));
      } catch (error) {
        if (!controller.signal.aborted) {
          setProductsError(
            error instanceof Error
              ? error.message
              : "Could not load marketplace listings.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }

    async function loadServices() {
      setServicesLoading(true);
      setServicesError("");

      try {
        const response = await fetch(`${API_BASE_URL}/services`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as ServicesResponse;

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Could not load technician services.",
          );
        }

        const services = result.services ?? result.data ?? [];
        setFeaturedServices(services.slice(0, 3));
      } catch (error) {
        if (!controller.signal.aborted) {
          setServicesError(
            error instanceof Error
              ? error.message
              : "Could not load technician services.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setServicesLoading(false);
      }
    }

    void loadProducts();
    void loadServices();

    return () => controller.abort();
  }, []);

  return (
    <>
      <Navbar />

      <main>
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-content">
              <span className="eyebrow">
                <span className="eyebrow-dot" />
                Made for campus life
              </span>

              <h1>
                Your campus.
                <br />
                Your community.
                <br />
                <span>One tech hub.</span>
              </h1>

              <p className="hero-description">
                Discover useful products, buy and sell within your campus, and
                connect with skilled technicians when you need support.
              </p>

              <div className="hero-actions">
                <Link to="/marketplace" className="button button-primary">
                  Explore Marketplace
                  <span aria-hidden="true">→</span>
                </Link>

                <Link to="/services" className="button button-secondary">
                  Find a Technician
                </Link>
              </div>

              <div className="hero-note">
                <span className="hero-note-icon" aria-hidden="true">
                  ✓
                </span>
                <span>
                  One platform for student trading and technical support
                </span>
              </div>
            </div>

            <div
              className="hero-visual"
              aria-label="Campus technology services"
            >
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />

              <div className="visual-main-card">
                <div className="visual-card-header">
                  <span className="visual-status">
                    <span className="status-dot" />
                    Campus marketplace
                  </span>
                  <span aria-hidden="true">•••</span>
                </div>

                <div className="visual-product-art" aria-hidden="true">
                  <span className="visual-laptop">💻</span>
                  <span className="visual-phone">📱</span>
                  <span className="visual-headphones">🎧</span>
                </div>

                <div className="visual-product-footer">
                  <div>
                    <strong>Campus essentials</strong>
                    <p>Find what you need nearby</p>
                  </div>
                  <span className="visual-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </div>

              <div className="floating-card floating-card-top">
                <span className="floating-icon floating-icon-green">✓</span>
                <div>
                  <strong>Skilled technicians</strong>
                  <p>Support when you need it</p>
                </div>
              </div>

              <div className="floating-card floating-card-bottom">
                <span className="floating-icon floating-icon-blue">↗</span>
                <div>
                  <strong>Student marketplace</strong>
                  <p>Buy and sell with ease</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-section">
          <div className="container trust-grid">
            <div className="trust-item">
              <span className="trust-number">01</span>
              <div>
                <strong>Discover</strong>
                <p>Find products and services</p>
              </div>
            </div>

            <div className="trust-item">
              <span className="trust-number">02</span>
              <div>
                <strong>Connect</strong>
                <p>Reach sellers and technicians</p>
              </div>
            </div>

            <div className="trust-item">
              <span className="trust-number">03</span>
              <div>
                <strong>Get things done</strong>
                <p>Manage your campus needs</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding" id="marketplace">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">THE MARKETPLACE</span>
                <h2>Good finds, closer to home.</h2>
                <p>
                  Browse useful products and discover what other students have
                  available.
                </p>
              </div>

              <Link to="/marketplace" className="text-link">
                Explore marketplace <span aria-hidden="true">→</span>
              </Link>
            </div>

            {productsLoading ? (
              <p role="status">Loading marketplace listings...</p>
            ) : productsError ? (
              <div className="home-data-message" role="alert">
                <p>Marketplace listings could not be loaded.</p>
                <p>{productsError}</p>
                <Link to="/marketplace" className="text-link">
                  Open marketplace <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="product-grid">
                {featuredProducts.map((product) => {
                  const imageUrl = getImageUrl(product.image);

                  return (
                    <article className="product-card" key={product._id}>
                      <Link
                        to="/marketplace"
                        className="product-art"
                        aria-label={`Browse ${product.name} in the marketplace`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            loading="lazy"
                          />
                        ) : (
                          <span className="product-image-empty">
                            No image available
                          </span>
                        )}

                        <span className="product-category">
                          {product.category}
                        </span>
                      </Link>

                      <div className="product-info">
                        <div className="product-meta">
                          <span>{product.condition}</span>
                        </div>

                        <h3>{product.name}</h3>

                        <div className="product-bottom">
                          <strong className="product-price">
                            {formatPrice(Number(product.price) || 0)}
                          </strong>

                          <Link
                            to="/marketplace"
                            className="product-view"
                            aria-label={`View ${product.name} in marketplace`}
                          >
                            →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="home-data-message">
                <h3>No products listed yet</h3>
                <p>
                  New marketplace listings will appear here when users publish
                  them.
                </p>
                <Link to="/marketplace" className="text-link">
                  Visit marketplace <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        <section
          className="section-padding services-section"
          id="services"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">TECHNICIAN SUPPORT</span>
                <h2>Find the right help.</h2>
                <p>
                  Connect with people who have the skills to solve your
                  technical problems.
                </p>
              </div>

              <Link to="/services" className="text-link">
                Browse services <span aria-hidden="true">→</span>
              </Link>
            </div>

            {servicesLoading ? (
              <p role="status">Loading technician services...</p>
            ) : servicesError ? (
              <div className="home-data-message" role="alert">
                <p>Technician services could not be loaded.</p>
                <p>{servicesError}</p>
                <Link to="/services" className="text-link">
                  Browse services <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : featuredServices.length > 0 ? (
              <div className="service-grid">
                {featuredServices.map((service) => {
                  const imageUrl = getImageUrl(service.image);

                  return (
                    <article className="service-card" key={service._id}>
                      {imageUrl && (
                        <img
                          className="service-card-image"
                          src={imageUrl}
                          alt=""
                          loading="lazy"
                        />
                      )}

                      <span className="service-icon" aria-hidden="true">
                        {service.category}
                      </span>

                      <h3>{service.title}</h3>
                      <p>{service.description}</p>

                      <Link to="/services" className="service-link">
                        View services <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="home-data-message">
                <h3>No services published yet</h3>
                <p>Services published by technicians will appear here.</p>
                <Link to="/services" className="text-link">
                  Explore services <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="section-padding" id="how-it-works">
          <div className="container">
            <div className="how-heading">
              <span className="section-kicker">HOW IT WORKS</span>

              <h2>Everything you need, in three simple steps.</h2>

              <p>
                Campus Tech Hub makes it easier for students to discover
                products, connect with technicians and access useful services
                within their campus community.
              </p>
            </div>

            <div className="steps-grid">
              <article className="step-card">
                <span className="step-number">01</span>

                <div className="step-icon" aria-hidden="true">
                  👤
                </div>

                <h3>Create an account</h3>

                <p>
                  Register as a student or technician to access the features
                  available to your account.
                </p>
              </article>

              <article className="step-card">
                <span className="step-number">02</span>

                <div className="step-icon" aria-hidden="true">
                  🛍️
                </div>

                <h3>Explore or publish</h3>

                <p>
                  Browse products listed by other students, discover technician
                  services, or publish your own products and services.
                </p>
              </article>

              <article className="step-card">
                <span className="step-number">03</span>

                <div className="step-icon" aria-hidden="true">
                  🤝
                </div>

                <h3>Connect directly</h3>

                <p>
                  Contact sellers or technicians using their available contact
                  details to discuss products and arrange technical support.
                </p>
              </article>
            </div>

            <div className="how-actions">
              <Link to="/marketplace" className="button button-primary">
                Explore Marketplace →
              </Link>

              <Link to="/services" className="button button-secondary">
                Find a Technician
              </Link>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-inner">
            <div>
              <span className="cta-kicker">YOUR CAMPUS, CONNECTED</span>
              <h2>Ready to make campus life easier?</h2>
              <p>
                Join a community built around useful products, technical
                skills, and easier connections.
              </p>
            </div>

            <Link to="/register" className="button cta-button">
              Create an account <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-content">
          <Link to="/" className="brand footer-brand">
            <span className="brand-mark" aria-hidden="true">
              C
            </span>

            <span className="brand-name">
              Campus<span>Tech</span>Hub
            </span>
          </Link>

          <p>
            A connected campus for student trading and technical support.
          </p>

          <div className="footer-links">
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/services">Technician Services</Link>

            {isAuthenticated && user ? (
              <>
                <Link to={dashboardPath}>Dashboard</Link>

                <button
                  type="button"
                  onClick={logout}
                  className="footer-logout"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login">Log in</Link>
            )}

            <Link to="/contact">Contact</Link>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Campus Tech Hub</span>
            <span>Built for campus communities.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Home