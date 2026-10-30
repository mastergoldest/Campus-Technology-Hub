import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./technician-dashboard-crud.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_STORAGE_KEY = "campus-tech-hub-token";

type DashboardTab = "overview" | "services" | "products" | "requests";
type ListingStatus = "idle" | "loading" | "saving" | "deleting";

interface ApiProduct {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  price?: number | string | null;
  location?: string;
  image?: string | { url?: string; publicId?: string } | null;
  images?: Array<string | { url?: string }>;
  createdAt?: string;
  updatedAt?: string;
  seller?: { name?: string; _id?: string; id?: string };
}

interface DashboardProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  price: number | null;
  location: string;
  image: string;
  createdAt: string;
}

interface ApiService {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  pricingModel?: string;
  price?: number | string | null;
  location?: string;
  contactMethod?: string;
  contactValue?: string;
  image?: string | { url?: string; publicId?: string } | null;
  createdAt?: string;
  updatedAt?: string;
  technician?: { name?: string; _id?: string; id?: string };
}

interface DashboardService {
  id: string;
  title: string;
  description: string;
  category: string;
  pricingModel: string;
  price: number | null;
  location: string;
  contactMethod: string;
  contactValue: string;
  image: string;
  createdAt: string;
}

interface ProductForm {
  name: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  location: string;
  imageFile: File | null;
}

interface ServiceForm {
  title: string;
  description: string;
  category: string;
  pricingModel: string;
  price: string;
  location: string;
  contactMethod: string;
  contactValue: string;
  imageFile: File | null;
}

const emptyProductForm: ProductForm = {
  name: "",
  description: "",
  category: "Electronics",
  condition: "Used",
  price: "",
  location: "",
  imageFile: null,
};

const emptyServiceForm: ServiceForm = {
  title: "",
  description: "",
  category: "Phone Repair",
  pricingModel: "Price on Request",
  price: "",
  location: "",
  contactMethod: "Phone",
  contactValue: "",
  imageFile: null,
};

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getImageUrl(
  image: string | { url?: string; publicId?: string } | null | undefined,
  images?: Array<string | { url?: string }>,
) {
  if (typeof image === "string") return image;
  if (image && typeof image === "object" && image.url) return image.url;

  const firstImage = images?.[0];
  if (typeof firstImage === "string") return firstImage;
  if (firstImage && typeof firstImage === "object" && firstImage.url) {
    return firstImage.url;
  }

  return "";
}

function toNullablePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProduct(product: ApiProduct): DashboardProduct {
  return {
    id: String(product.id ?? product._id ?? ""),
    name: product.name ?? product.title ?? "Untitled product",
    description: product.description ?? "",
    category: product.category ?? "Other",
    condition: product.condition ?? "Used",
    price: toNullablePrice(product.price),
    location: product.location ?? "",
    image: getImageUrl(product.image, product.images),
    createdAt: product.createdAt ?? product.updatedAt ?? "",
  };
}

function normalizeService(service: ApiService): DashboardService {
  return {
    id: String(service.id ?? service._id ?? ""),
    title: service.title ?? "Untitled service",
    description: service.description ?? "",
    category: service.category ?? "Other",
    pricingModel: service.pricingModel ?? "Price on Request",
    price: toNullablePrice(service.price),
    location: service.location ?? "",
    contactMethod: service.contactMethod ?? "Phone",
    contactValue: service.contactValue ?? "",
    image: getImageUrl(service.image),
    createdAt: service.createdAt ?? service.updatedAt ?? "",
  };
}

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || "The request could not be completed.");
  }
  return payload;
}

function extractArray<T>(payload: any, key: string): T[] {
  const value = payload?.[key] ?? payload?.data?.[key] ?? payload?.data;
  return Array.isArray(value) ? value : [];
}

function formatDate(date: string) {
  const parsedDate = new Date(date);
  if (!date || Number.isNaN(parsedDate.getTime())) return "Date unavailable";
  return parsedDate.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(price: number | null) {
  if (price === null) return "Price on request";
  return `₦${price.toLocaleString("en-NG")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function TechnicianDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [services, setServices] = useState<DashboardService[]>([]);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [servicesLoading, setServicesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [productsError, setProductsError] = useState("");
  const [notice, setNotice] = useState("");

  const [viewService, setViewService] = useState<DashboardService | null>(null);
  const [editService, setEditService] = useState<DashboardService | null>(null);
  const [deleteService, setDeleteService] = useState<DashboardService | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [serviceStatus, setServiceStatus] = useState<ListingStatus>("idle");
  const [serviceFormError, setServiceFormError] = useState("");

  const [viewProduct, setViewProduct] = useState<DashboardProduct | null>(null);
  const [editProduct, setEditProduct] = useState<DashboardProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<DashboardProduct | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [productStatus, setProductStatus] = useState<ListingStatus>("idle");
  const [productFormError, setProductFormError] = useState("");

  const loadMyServices = useCallback(async (signal?: AbortSignal) => {
    setServicesLoading(true);
    setServicesError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const response = await fetch(`${API_BASE_URL}/services/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const payload = await readResponse(response);
      const items = extractArray<ApiService>(payload, "services");
      setServices(items.map(normalizeService).filter((item) => item.id));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setServicesError(getErrorMessage(error));
    } finally {
      if (!signal?.aborted) setServicesLoading(false);
    }
  }, []);

  const loadMyProducts = useCallback(async (signal?: AbortSignal) => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const response = await fetch(`${API_BASE_URL}/products/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const payload = await readResponse(response);
      const items = extractArray<ApiProduct>(payload, "products");
      setProducts(items.map(normalizeProduct).filter((item) => item.id));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setProductsError(getErrorMessage(error));
    } finally {
      if (!signal?.aborted) setProductsLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    void loadMyServices();
    void loadMyProducts();
  }, [loadMyProducts, loadMyServices]);

  useEffect(() => {
    const controller = new AbortController();
    void loadMyServices(controller.signal);
    void loadMyProducts(controller.signal);

    const handleFocus = () => refreshDashboard();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("campus-listings-updated", handleFocus);

    return () => {
      controller.abort();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("campus-listings-updated", handleFocus);
    };
  }, [loadMyProducts, loadMyServices, refreshDashboard]);

  const recentServices = useMemo(
    () => [...services].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [services],
  );
  const recentProducts = useMemo(
    () => [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [products],
  );

  function openTab(tab: DashboardTab) {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setNotice("");
  }

  function startEditService(service: DashboardService) {
    setServiceForm({
      title: service.title,
      description: service.description,
      category: service.category,
      pricingModel: service.pricingModel,
      price: service.price === null ? "" : String(service.price),
      location: service.location,
      contactMethod: service.contactMethod,
      contactValue: service.contactValue,
      imageFile: null,
    });
    setServiceFormError("");
    setEditService(service);
    setViewService(null);
  }

  function startEditProduct(product: DashboardProduct) {
    setProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      condition: product.condition,
      price: product.price === null ? "" : String(product.price),
      location: product.location,
      imageFile: null,
    });
    setProductFormError("");
    setEditProduct(product);
    setViewProduct(null);
  }

  async function handleServiceUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editService) return;
    setServiceStatus("saving");
    setServiceFormError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const formData = new FormData();
      formData.append("title", serviceForm.title.trim());
      formData.append("description", serviceForm.description.trim());
      formData.append("category", serviceForm.category);
      formData.append("pricingModel", serviceForm.pricingModel);
      formData.append("price", serviceForm.pricingModel === "Price on Request" ? "" : serviceForm.price);
      formData.append("location", serviceForm.location.trim());
      formData.append("contactMethod", serviceForm.contactMethod);
      formData.append("contactValue", serviceForm.contactValue.trim());
      if (serviceForm.imageFile) formData.append("image", serviceForm.imageFile);

      const response = await fetch(`${API_BASE_URL}/services/${editService.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      await readResponse(response);
      setEditService(null);
      setNotice("Service updated successfully.");
      await loadMyServices();
    } catch (error) {
      setServiceFormError(getErrorMessage(error));
    } finally {
      setServiceStatus("idle");
    }
  }

  async function confirmDeleteService() {
    if (!deleteService) return;
    setServiceStatus("deleting");
    try {
      const token = getToken();
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const response = await fetch(`${API_BASE_URL}/services/${deleteService.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await readResponse(response);
      setServices((current) => current.filter((service) => service.id !== deleteService.id));
      setNotice("Service deleted successfully.");
      setDeleteService(null);
    } catch (error) {
      setServicesError(getErrorMessage(error));
      setDeleteService(null);
    } finally {
      setServiceStatus("idle");
    }
  }

  async function handleProductUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editProduct) return;
    setProductStatus("saving");
    setProductFormError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const formData = new FormData();
      formData.append("name", productForm.name.trim());
      formData.append("description", productForm.description.trim());
      formData.append("category", productForm.category);
      formData.append("condition", productForm.condition);
      formData.append("price", productForm.price);
      formData.append("location", productForm.location.trim());
      if (productForm.imageFile) formData.append("image", productForm.imageFile);

      const response = await fetch(`${API_BASE_URL}/products/${editProduct.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      await readResponse(response);
      setEditProduct(null);
      setNotice("Product updated successfully.");
      await loadMyProducts();
    } catch (error) {
      setProductFormError(getErrorMessage(error));
    } finally {
      setProductStatus("idle");
    }
  }

  async function confirmDeleteProduct() {
    if (!deleteProduct) return;
    setProductStatus("deleting");
    try {
      const token = getToken();
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const response = await fetch(`${API_BASE_URL}/products/${deleteProduct.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await readResponse(response);
      setProducts((current) => current.filter((product) => product.id !== deleteProduct.id));
      setNotice("Product deleted successfully.");
      setDeleteProduct(null);
    } catch (error) {
      setProductsError(getErrorMessage(error));
      setDeleteProduct(null);
    } finally {
      setProductStatus("idle");
    }
  }

  function renderServiceCard(service: DashboardService) {
    return (
      <article className="tech-management-row" key={service.id}>
        <div className="tech-management-image">
          {service.image ? <img src={service.image} alt={service.title} /> : <span>⚒</span>}
        </div>
        <div className="tech-management-info">
          <span>{service.category}</span>
          <h3>{service.title}</h3>
          <p>{service.location || "Location not specified"}</p>
          <small>Published {formatDate(service.createdAt)}</small>
        </div>
        <div className="tech-management-end">
          <strong>{service.pricingModel === "Price on Request" ? "Price on request" : formatPrice(service.price)}</strong>
          <div className="tech-row-actions">
            <button type="button" onClick={() => setViewService(service)}>View</button>
            <button type="button" onClick={() => startEditService(service)}>Edit</button>
            <button type="button" className="danger" onClick={() => setDeleteService(service)}>Delete</button>
          </div>
        </div>
      </article>
    );
  }

  function renderProductCard(product: DashboardProduct) {
    return (
      <article className="tech-management-row" key={product.id}>
        <div className="tech-management-image">
          {product.image ? <img src={product.image} alt={product.name} /> : <span>▣</span>}
        </div>
        <div className="tech-management-info">
          <span>{product.category}</span>
          <h3>{product.name}</h3>
          <p>{product.condition} · {product.location || "Location not specified"}</p>
          <small>Listed {formatDate(product.createdAt)}</small>
        </div>
        <div className="tech-management-end">
          <strong>{formatPrice(product.price)}</strong>
          <div className="tech-row-actions">
            <button type="button" onClick={() => setViewProduct(product)}>View</button>
            <button type="button" onClick={() => startEditProduct(product)}>Edit</button>
            <button type="button" className="danger" onClick={() => setDeleteProduct(product)}>Delete</button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <Navbar />
      <main className="tech-dashboard">
        <div className="tech-dashboard-layout">
          <aside className={`tech-dashboard-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
            <div className="tech-sidebar-heading">
              <span className="tech-sidebar-eyebrow">WORKSPACE</span>
              <h2>Technician Hub</h2>
              <p>Manage your campus services.</p>
            </div>

            <nav className="tech-dashboard-navigation" aria-label="Technician dashboard navigation">
              <button type="button" className={activeTab === "overview" ? "active" : ""} onClick={() => openTab("overview")}><span className="tech-nav-icon">▦</span>Overview</button>
              <button type="button" className={activeTab === "services" ? "active" : ""} onClick={() => openTab("services")}><span className="tech-nav-icon">⚒</span>My Services<span className="tech-nav-count">{services.length}</span></button>
              <button type="button" className={activeTab === "products" ? "active" : ""} onClick={() => openTab("products")}><span className="tech-nav-icon">▣</span>My Products<span className="tech-nav-count">{products.length}</span></button>
              <button type="button" className={activeTab === "requests" ? "active" : ""} onClick={() => openTab("requests")}><span className="tech-nav-icon">✉</span>Service Requests<span className="tech-nav-badge">Soon</span></button>
            </nav>

            <div className="tech-sidebar-divider" />
            <div className="tech-sidebar-links">
              <Link to="/profile"><span className="tech-nav-icon">◉</span>My Profile</Link>
              <Link to="/services"><span className="tech-nav-icon">⌕</span>Browse Services</Link>
              <Link to="/"><span className="tech-nav-icon">⌂</span>Visit Homepage</Link>
            </div>

            <div className="tech-sidebar-help">
              <span className="tech-help-icon">✦</span>
              <h3>Grow your skills</h3>
              <p>Make your services easy to discover across your campus community.</p>
              <Link to="/services/create">Publish a service →</Link>
            </div>
          </aside>

          <section className="tech-dashboard-main">
            <div className="tech-mobile-toolbar">
              <button type="button" className="tech-mobile-menu-button" onClick={() => setMobileMenuOpen((previous) => !previous)} aria-expanded={mobileMenuOpen}>
                ☰ {mobileMenuOpen ? "Close menu" : "Dashboard menu"}
              </button>
            </div>

            <header className="tech-dashboard-header">
              <div>
                <span className="tech-dashboard-eyebrow">TECHNICIAN WORKSPACE</span>
                <h1>{activeTab === "overview" ? "Your workspace" : activeTab === "services" ? "Your services" : activeTab === "products" ? "Your products" : "Service requests"}</h1>
                <p>{activeTab === "overview" ? "Manage your services and marketplace listings in one place." : activeTab === "services" ? "View, edit, or remove services you have published." : activeTab === "products" ? "Manage your own marketplace listings." : "Your workspace for handling customer enquiries and service bookings."}</p>
              </div>
              <div className="tech-header-actions">
                <Link to="/services/create" className="tech-button tech-button-primary">+ Add service</Link>
                <Link to="/marketplace/create" className="tech-button tech-button-secondary">+ Add product</Link>
              </div>
            </header>

            {notice && <div className="tech-alert success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}

            {activeTab === "overview" && (
              <>
                <section className="tech-welcome-banner">
                  <div className="tech-welcome-copy">
                    <span>YOUR CAMPUS. YOUR EXPERTISE.</span>
                    <h2>Turn your skills<br />into opportunities.</h2>
                    <p>Showcase your expertise, publish services, and help students find the technical support they need.</p>
                    <Link to="/services/create" className="tech-banner-button">Publish a service <span>→</span></Link>
                  </div>
                  <div className="tech-welcome-art" aria-hidden="true">
                    <div className="tech-art-circle"><div className="tech-art-inner"><span>✦</span><strong>TECH</strong><small>YOUR SKILLS MATTER</small></div></div>
                    <div className="tech-art-floating tech-art-one">⚙</div><div className="tech-art-floating tech-art-two">✓</div>
                  </div>
                </section>

                <section className="tech-stat-grid">
                  <article className="tech-stat-card"><div className="tech-stat-top"><span>My services</span><span className="tech-stat-icon blue">⚒</span></div><strong>{servicesLoading ? "…" : services.length}</strong><p>Services linked to your account</p></article>
                  <article className="tech-stat-card"><div className="tech-stat-top"><span>My products</span><span className="tech-stat-icon purple">▣</span></div><strong>{productsLoading ? "…" : products.length}</strong><p>Products linked to your account</p></article>
                  <article className="tech-stat-card"><div className="tech-stat-top"><span>Service requests</span><span className="tech-stat-icon orange">✉</span></div><strong>—</strong><p>Request workflow is not connected yet</p></article>
                  <article className="tech-stat-card"><div className="tech-stat-top"><span>Account access</span><span className="tech-stat-icon green">✓</span></div><strong className="tech-status-text">Connected</strong><p>Listings load from the backend</p></article>
                </section>

                <section className="tech-content-section">
                  <div className="tech-section-heading"><div><h2>Recent services</h2><p>Your latest service listings.</p></div><button type="button" className="tech-text-button" onClick={() => openTab("services")}>Manage services →</button></div>
                  {servicesLoading ? <div className="tech-inline-empty">Loading your services…</div> : servicesError ? <div className="tech-inline-error" role="alert">{servicesError}<button type="button" onClick={() => void loadMyServices()}>Try again</button></div> : recentServices.length ? <div className="tech-listing-grid">{recentServices.map((service) => <article className="tech-listing-card" key={service.id}><div className="tech-listing-image">{service.image ? <img src={service.image} alt={service.title} /> : <span>⚒</span>}</div><div className="tech-listing-content"><span className="tech-listing-category">{service.category}</span><h3>{service.title}</h3><p>{service.description.length > 85 ? `${service.description.slice(0, 85)}…` : service.description}</p><div className="tech-listing-footer"><strong>{service.pricingModel === "Price on Request" ? "Price on request" : formatPrice(service.price)}</strong><span>{formatDate(service.createdAt)}</span></div><div className="tech-row-actions"><button type="button" onClick={() => setViewService(service)}>View</button><button type="button" onClick={() => startEditService(service)}>Edit</button><button type="button" className="danger" onClick={() => setDeleteService(service)}>Delete</button></div></div></article>)}</div> : <div className="tech-empty-state"><div className="tech-empty-icon">⚒</div><h3>Your next opportunity starts here</h3><p>You haven't published a service yet. Create your first listing to get started.</p><Link to="/services/create" className="tech-button tech-button-primary">Create your first service</Link></div>}
                </section>

                <section className="tech-content-section">
                  <div className="tech-section-heading"><div><h2>Recent products</h2><p>Your latest marketplace listings.</p></div><button type="button" className="tech-text-button" onClick={() => openTab("products")}>Manage products →</button></div>
                  {productsLoading ? <div className="tech-inline-empty">Loading your products…</div> : productsError ? <div className="tech-inline-error" role="alert">{productsError}<button type="button" onClick={() => void loadMyProducts()}>Try again</button></div> : recentProducts.length ? <div className="tech-product-list">{recentProducts.map((product) => <article className="tech-product-row" key={product.id}><div className="tech-product-image">{product.image ? <img src={product.image} alt={product.name} /> : <span>▣</span>}</div><div className="tech-product-details"><h3>{product.name}</h3><p>{product.category} · {product.condition}</p><small>{product.location}</small></div><strong className="tech-product-price">{formatPrice(product.price)}</strong><div className="tech-row-actions"><button type="button" onClick={() => setViewProduct(product)}>View</button><button type="button" onClick={() => startEditProduct(product)}>Edit</button><button type="button" className="danger" onClick={() => setDeleteProduct(product)}>Delete</button></div></article>)}</div> : <div className="tech-inline-empty">You have not published any products yet. <Link to="/marketplace/create">Add a product →</Link></div>}
                </section>

                <section className="tech-quick-actions"><div><h2>Quick actions</h2><p>Jump straight to your next task.</p></div><Link to="/services/create"><span>⚒</span><strong>Publish service</strong><small>Showcase your skills</small><b>→</b></Link><Link to="/marketplace/create"><span>▣</span><strong>Add product</strong><small>List an item for sale</small><b>→</b></Link><Link to="/profile"><span>◉</span><strong>Update profile</strong><small>Manage your information</small><b>→</b></Link></section>
              </>
            )}

            {activeTab === "services" && <section className="tech-content-section tech-tab-content"><div className="tech-section-heading"><div><h2>My service listings</h2><p>{services.length} service listing(s) associated with your account.</p></div><Link to="/services/create" className="tech-button tech-button-primary">+ Create service</Link></div>{servicesLoading ? <div className="tech-inline-empty">Loading your services…</div> : servicesError ? <div className="tech-inline-error" role="alert">{servicesError}<button type="button" onClick={() => void loadMyServices()}>Try again</button></div> : services.length ? <div className="tech-management-list">{services.map(renderServiceCard)}</div> : <div className="tech-empty-state"><div className="tech-empty-icon">⚒</div><h3>No service listings yet</h3><p>Publish a service to start showcasing your skills.</p><Link to="/services/create" className="tech-button tech-button-primary">Create service</Link></div>}</section>}

            {activeTab === "products" && <section className="tech-content-section tech-tab-content"><div className="tech-section-heading"><div><h2>My marketplace listings</h2><p>{products.length} product listing(s) associated with your account.</p></div><Link to="/marketplace/create" className="tech-button tech-button-primary">+ Add product</Link></div>{productsLoading ? <div className="tech-inline-empty">Loading your products…</div> : productsError ? <div className="tech-inline-error" role="alert">{productsError}<button type="button" onClick={() => void loadMyProducts()}>Try again</button></div> : products.length ? <div className="tech-management-list">{products.map(renderProductCard)}</div> : <div className="tech-empty-state"><div className="tech-empty-icon">▣</div><h3>No product listings yet</h3><p>Add a product if you have an item to sell.</p><Link to="/marketplace/create" className="tech-button tech-button-primary">Add product</Link></div>}</section>}

            {activeTab === "requests" && <section className="tech-content-section tech-tab-content"><div className="tech-request-hero"><div className="tech-request-icon">✉</div><span>PLANNED FOR THE NEXT PHASE</span><h2>Service requests and bookings</h2><p>This area will allow technicians to review incoming enquiries, communicate with customers, and track the progress of service requests.</p></div><div className="tech-request-features"><article><span>01</span><h3>Incoming requests</h3><p>See which customers need your services.</p></article><article><span>02</span><h3>Request status</h3><p>Accept, decline, or update service requests.</p></article><article><span>03</span><h3>Customer communication</h3><p>Keep service discussions and updates organized.</p></article></div><div className="tech-data-notice">Service requests are not connected yet. They require a dedicated backend model and customer-request workflow.</div></section>}

            <footer className="tech-dashboard-footer"><span>CampusTechHub</span><span>Connecting campus skills with opportunity.</span></footer>
          </section>
        </div>
      </main>

      {viewService && <div className="tech-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewService(null); }}><section className="tech-modal" role="dialog" aria-modal="true" aria-labelledby="view-service-title"><button className="tech-modal-close" type="button" onClick={() => setViewService(null)} aria-label="Close">×</button>{viewService.image && <img className="tech-modal-image" src={viewService.image} alt={viewService.title} />}<span className="tech-listing-category">{viewService.category}</span><h2 id="view-service-title">{viewService.title}</h2><p className="tech-modal-description">{viewService.description}</p><dl className="tech-detail-list"><div><dt>Pricing</dt><dd>{viewService.pricingModel === "Price on Request" ? "Price on request" : formatPrice(viewService.price)}</dd></div><div><dt>Location</dt><dd>{viewService.location || "Not specified"}</dd></div><div><dt>Contact method</dt><dd>{viewService.contactMethod}</dd></div><div><dt>Contact detail</dt><dd>{viewService.contactValue || "Not provided"}</dd></div><div><dt>Created</dt><dd>{formatDate(viewService.createdAt)}</dd></div></dl><div className="tech-modal-actions"><button type="button" className="tech-button tech-button-secondary" onClick={() => setViewService(null)}>Close</button><button type="button" className="tech-button tech-button-primary" onClick={() => startEditService(viewService)}>Edit service</button></div></section></div>}

      {viewProduct && <div className="tech-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewProduct(null); }}><section className="tech-modal" role="dialog" aria-modal="true" aria-labelledby="view-product-title"><button className="tech-modal-close" type="button" onClick={() => setViewProduct(null)} aria-label="Close">×</button>{viewProduct.image && <img className="tech-modal-image" src={viewProduct.image} alt={viewProduct.name} />}<span className="tech-listing-category">{viewProduct.category}</span><h2 id="view-product-title">{viewProduct.name}</h2><p className="tech-modal-description">{viewProduct.description || "No description provided."}</p><dl className="tech-detail-list"><div><dt>Price</dt><dd>{formatPrice(viewProduct.price)}</dd></div><div><dt>Condition</dt><dd>{viewProduct.condition}</dd></div><div><dt>Location</dt><dd>{viewProduct.location || "Not specified"}</dd></div><div><dt>Listed</dt><dd>{formatDate(viewProduct.createdAt)}</dd></div></dl><div className="tech-modal-actions"><button type="button" className="tech-button tech-button-secondary" onClick={() => setViewProduct(null)}>Close</button><button type="button" className="tech-button tech-button-primary" onClick={() => startEditProduct(viewProduct)}>Edit product</button></div></section></div>}

      {editService && <div className="tech-modal-backdrop" role="presentation"><section className="tech-modal tech-modal-wide" role="dialog" aria-modal="true" aria-labelledby="edit-service-title"><button className="tech-modal-close" type="button" onClick={() => setEditService(null)} aria-label="Close" disabled={serviceStatus === "saving"}>×</button><h2 id="edit-service-title">Edit service</h2><p className="tech-modal-subtitle">Update your listing details. Leave the image field empty to keep the current image.</p><form className="tech-edit-form" onSubmit={handleServiceUpdate}><label>Service title<input required minLength={3} maxLength={100} value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} /></label><label>Category<select value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })}>{["Phone Repair", "Computer Repair", "Software & Web Development", "Graphics Design", "Networking", "Electronics", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="full">Description<textarea required minLength={10} rows={4} value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} /></label><label>Pricing model<select value={serviceForm.pricingModel} onChange={(event) => setServiceForm({ ...serviceForm, pricingModel: event.target.value, price: event.target.value === "Price on Request" ? "" : serviceForm.price })}>{["Fixed Price", "Hourly Rate", "Price on Request"].map((item) => <option key={item}>{item}</option>)}</select></label>{serviceForm.pricingModel !== "Price on Request" && <label>Price (₦)<input type="number" min="0" step="1" required value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} /></label>}<label>Location<input required value={serviceForm.location} onChange={(event) => setServiceForm({ ...serviceForm, location: event.target.value })} /></label><label>Contact method<select value={serviceForm.contactMethod} onChange={(event) => setServiceForm({ ...serviceForm, contactMethod: event.target.value })}>{["Phone", "Email", "WhatsApp"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Contact detail<input required value={serviceForm.contactValue} onChange={(event) => setServiceForm({ ...serviceForm, contactValue: event.target.value })} /></label><label>Replace image<input type="file" accept="image/*" onChange={(event) => setServiceForm({ ...serviceForm, imageFile: event.target.files?.[0] ?? null })} /><small>Optional. Images are uploaded to the configured backend.</small></label>{serviceFormError && <p className="tech-form-error full" role="alert">{serviceFormError}</p>}<div className="tech-modal-actions full"><button type="button" className="tech-button tech-button-secondary" disabled={serviceStatus === "saving"} onClick={() => setEditService(null)}>Cancel</button><button type="submit" className="tech-button tech-button-primary" disabled={serviceStatus === "saving"}>{serviceStatus === "saving" ? "Saving…" : "Save changes"}</button></div></form></section></div>}

      {editProduct && <div className="tech-modal-backdrop" role="presentation"><section className="tech-modal tech-modal-wide" role="dialog" aria-modal="true" aria-labelledby="edit-product-title"><button className="tech-modal-close" type="button" onClick={() => setEditProduct(null)} aria-label="Close" disabled={productStatus === "saving"}>×</button><h2 id="edit-product-title">Edit product</h2><p className="tech-modal-subtitle">Update your product listing. Leave the image field empty to keep the current image.</p><form className="tech-edit-form" onSubmit={handleProductUpdate}><label>Product name<input required minLength={2} maxLength={100} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label><label>Category<select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}>{["Phones", "Electronics", "Computers", "Fashion", "Books & Education", "Accessories", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="full">Description<textarea required minLength={5} rows={4} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label><label>Condition<select value={productForm.condition} onChange={(event) => setProductForm({ ...productForm, condition: event.target.value })}>{["New", "Used"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Price (₦)<input type="number" min="0" step="1" required value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label><label>Location<input required value={productForm.location} onChange={(event) => setProductForm({ ...productForm, location: event.target.value })} /></label><label>Replace image<input type="file" accept="image/*" onChange={(event) => setProductForm({ ...productForm, imageFile: event.target.files?.[0] ?? null })} /><small>Optional. Images are uploaded to the configured backend.</small></label>{productFormError && <p className="tech-form-error full" role="alert">{productFormError}</p>}<div className="tech-modal-actions full"><button type="button" className="tech-button tech-button-secondary" disabled={productStatus === "saving"} onClick={() => setEditProduct(null)}>Cancel</button><button type="submit" className="tech-button tech-button-primary" disabled={productStatus === "saving"}>{productStatus === "saving" ? "Saving…" : "Save changes"}</button></div></form></section></div>}

      {deleteService && <div className="tech-modal-backdrop" role="presentation"><section className="tech-modal tech-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-service-title"><h2 id="delete-service-title">Delete this service?</h2><p>This will permanently remove <strong>{deleteService.title}</strong> from your listings. This action cannot be undone.</p><div className="tech-modal-actions"><button type="button" className="tech-button tech-button-secondary" disabled={serviceStatus === "deleting"} onClick={() => setDeleteService(null)}>Cancel</button><button type="button" className="tech-button tech-button-danger" disabled={serviceStatus === "deleting"} onClick={() => void confirmDeleteService()}>{serviceStatus === "deleting" ? "Deleting…" : "Delete service"}</button></div></section></div>}

      {deleteProduct && <div className="tech-modal-backdrop" role="presentation"><section className="tech-modal tech-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title"><h2 id="delete-product-title">Delete this product?</h2><p>This will permanently remove <strong>{deleteProduct.name}</strong> from your listings. This action cannot be undone.</p><div className="tech-modal-actions"><button type="button" className="tech-button tech-button-secondary" disabled={productStatus === "deleting"} onClick={() => setDeleteProduct(null)}>Cancel</button><button type="button" className="tech-button tech-button-danger" disabled={productStatus === "deleting"} onClick={() => void confirmDeleteProduct()}>{productStatus === "deleting" ? "Deleting…" : "Delete product"}</button></div></section></div>}
    </>
  );
}

export default TechnicianDashboard;
