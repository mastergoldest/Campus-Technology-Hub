import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import type { ProductListing } from "../utils/storage";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ApiProduct {
  _id: string;
  name: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  description: string;
  image?: string | { url?: string; publicId?: string } | null;
  createdAt: string;
}

interface ApiService {
  _id: string;
  title: string;
  category: string;
  description: string;
  pricingModel: "Fixed Price" | "Hourly Rate" | "Price on Request";
  price: number | null;
  location: string;
  image?: string | { url?: string; publicId?: string } | null;
  createdAt: string;
}

interface ProductsResponse {
  success: boolean;
  products?: ApiProduct[];
  message?: string;
}

interface ServicesResponse {
  success: boolean;
  services?: ApiService[];
  message?: string;
}

interface MyServicesResponse extends ServicesResponse {
  data?: ApiService[];
}

type AccountType = "Student" | "Technician" | "Admin";
type ActiveTab = "products" | "services";

interface DashboardService {
  id: string;
  title: string;
  category: string;
  description: string;
  pricingModel: ApiService["pricingModel"];
  price: number | null;
  location: string;
  image: string;
  createdAt: string;
}

function getImageUrl(image: ApiProduct["image"] | ApiService["image"]) {
  if (typeof image === "string") return image;
  return image?.url || "";
}

function normalizeProduct(product: ApiProduct): ProductListing {
  return {
    id: product._id,
    name: product.name,
    price: Number(product.price),
    category: product.category,
    condition: product.condition,
    seller: "You",
    location: product.location,
    description: product.description,
    image: getImageUrl(product.image),
    createdAt: product.createdAt,
  };
}

function normalizeService(service: ApiService): DashboardService {
  return {
    id: service._id,
    title: service.title,
    category: service.category,
    description: service.description,
    pricingModel: service.pricingModel,
    price: service.price === null ? null : Number(service.price),
    location: service.location,
    image: getImageUrl(service.image),
    createdAt: service.createdAt,
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Recently added";

  return parsed.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Dashboard() {
  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [products, setProducts] = useState<ProductListing[]>([]);
  const [services, setServices] = useState<DashboardService[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [servicesError, setServicesError] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [viewProduct, setViewProduct] = useState<ProductListing | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductListing | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [editProductError, setEditProductError] = useState("");
  const [editProductSuccess, setEditProductSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");

  const loadMyProducts = useCallback(async (signal?: AbortSignal) => {
    if (isAuthLoading) return;

    if (!isAuthenticated || !token) {
      setProducts([]);
      setProductsError("");
      setIsLoadingProducts(false);
      return;
    }

    setIsLoadingProducts(true);
    setProductsError("");

    try {
      const response = await fetch(`${API_BASE_URL}/products/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const data = (await response.json()) as ProductsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load your products.");
      }

      setProducts((data.products || []).map(normalizeProduct));
    } catch (error) {
      if (signal?.aborted) return;
      setProductsError(
        error instanceof Error ? error.message : "Unable to load your products.",
      );
    } finally {
      if (!signal?.aborted) setIsLoadingProducts(false);
    }
  }, [isAuthLoading, isAuthenticated, token]);

  const loadMyServices = useCallback(async (signal?: AbortSignal) => {
    if (isAuthLoading) return;

    if (!isAuthenticated || !token) {
      setServices([]);
      setServicesError("");
      setIsLoadingServices(false);
      return;
    }

    setIsLoadingServices(true);
    setServicesError("");

    try {
      const response = await fetch(`${API_BASE_URL}/services/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const data = (await response.json()) as MyServicesResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load your services.");
      }

      const serviceList = data.services ?? data.data ?? [];
      setServices(serviceList.map(normalizeService));
    } catch (error) {
      if (signal?.aborted) return;
      setServicesError(
        error instanceof Error ? error.message : "Unable to load your services.",
      );
    } finally {
      if (!signal?.aborted) setIsLoadingServices(false);
    }
  }, [isAuthLoading, isAuthenticated, token]);

  useEffect(() => {
    const controller = new AbortController();

    void loadMyProducts(controller.signal);
    void loadMyServices(controller.signal);

    function refreshListings() {
      void loadMyProducts();
      void loadMyServices();
    }

    window.addEventListener("focus", refreshListings);
    window.addEventListener("campus-listings-updated", refreshListings);

    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshListings);
      window.removeEventListener("campus-listings-updated", refreshListings);
    };
  }, [loadMyProducts, loadMyServices]);

  async function handleDeleteProduct(product: ProductListing) {
    if (!token) {
      setDeleteError("Please log in again to delete a product.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingProductId(product.id);
    setDeleteError("");

    try {
      const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(product.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to delete this product.");
      }

      setProducts((current) => current.filter((item) => item.id !== product.id));
      window.dispatchEvent(new Event("campus-listings-updated"));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete this product.");
    } finally {
      setDeletingProductId(null);
    }
  }

  function openEditProduct(product: ProductListing) {
    setEditingProduct(product);
    setEditProductError("");
    setEditProductSuccess("");
  }

  async function handleUpdateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct) return;

    if (!token) {
      setEditProductError("Please log in again to edit a product.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSavingProduct(true);
    setEditProductError("");
    setEditProductSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(editingProduct.id)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        product?: ApiProduct;
      };

      if (!response.ok || !data.success || !data.product) {
        throw new Error(data.message || "Unable to update this product.");
      }

      const updated = normalizeProduct(data.product);
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingProduct(null);
      setEditProductSuccess("Product updated successfully.");
      window.dispatchEvent(new Event("campus-listings-updated"));
    } catch (error) {
      setEditProductError(error instanceof Error ? error.message : "Unable to update this product.");
    } finally {
      setIsSavingProduct(false);
    }
  }

  const displayName = user?.name?.trim() || "Campus Member";
  const email = user?.email || "Add your email address";
  const accountType: AccountType =
    user?.role === "technician" ? "Technician" : user?.role === "admin" ? "Admin" : "Student";

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "CM";
  }, [displayName]);

  const activityCount = products.length + services.length;
  const recentProducts = products.slice(0, 4);
  const recentServices = services.slice(0, 4);

  return (
    <>
      <Navbar />
      <main className="dashboard-page">
        <div className="dashboard-container">
          <section className="dashboard-welcome">
            <div>
              <span className="dashboard-eyebrow">CAMPUS TECHNOLOGY HUB</span>
              <h1>Welcome back, <span>{displayName.split(" ")[0]}.</span></h1>
              <p>Manage your listings, discover opportunities, and stay connected with your campus community.</p>
            </div>
            <div className="dashboard-welcome-actions">
              <Link to="/marketplace/create" className="dashboard-primary-btn">+ Sell a product</Link>
              <Link to="/services/create" className="dashboard-secondary-btn">+ Offer a service</Link>
            </div>
          </section>

          <section className="dashboard-profile-card">
            <div className="dashboard-profile-main">
              <div className="dashboard-avatar">{initials}</div>
              <div className="dashboard-profile-details">
                <div className="dashboard-profile-name-row">
                  <h2>{displayName}</h2>
                  <span className="dashboard-role-badge">{accountType}</span>
                </div>
                <p>{email}</p>
                <span className="dashboard-member-status"><span className="dashboard-status-dot" />Campus community member</span>
              </div>
            </div>
            <Link to="/profile" className="dashboard-outline-btn">Edit profile <span aria-hidden="true">→</span></Link>
          </section>

          <section className="dashboard-stat-grid">
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-icon-blue">🛍️</div>
              <div><span className="dashboard-stat-label">My products</span><h3>{products.length}</h3><p>Products you've published</p></div>
              <Link to="/marketplace/create" className="dashboard-stat-link" aria-label="Create a product">+</Link>
            </article>
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-icon-green">🛠️</div>
              <div><span className="dashboard-stat-label">My services</span><h3>{services.length}</h3><p>Services you've published</p></div>
              <Link to="/services/create" className="dashboard-stat-link" aria-label="Create a service">+</Link>
            </article>
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-icon-purple">⚡</div>
              <div><span className="dashboard-stat-label">Total listings</span><h3>{activityCount}</h3><p>Your products and services</p></div>
              <span className="dashboard-stat-decoration" aria-hidden="true">↗</span>
            </article>
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-icon-orange">🎓</div>
              <div><span className="dashboard-stat-label">Account type</span><h3 className="dashboard-account-value">{accountType}</h3><p>Your campus role</p></div>
            </article>
          </section>

          <div className="dashboard-content-grid">
            <section className="dashboard-panel dashboard-listings-panel">
              <div className="dashboard-panel-heading">
                <div><span className="dashboard-eyebrow">YOUR ACTIVITY</span><h2>Manage your listings</h2><p>Keep track of what you've shared with the community.</p></div>
                <Link to="/marketplace" className="dashboard-text-link">Explore marketplace →</Link>
              </div>

              <div className="dashboard-tabs" role="tablist" aria-label="Your listings">
                <button type="button" role="tab" aria-selected={activeTab === "products"} className={activeTab === "products" ? "dashboard-tab active" : "dashboard-tab"} onClick={() => setActiveTab("products")}>My products <span>{products.length}</span></button>
                <button type="button" role="tab" aria-selected={activeTab === "services"} className={activeTab === "services" ? "dashboard-tab active" : "dashboard-tab"} onClick={() => setActiveTab("services")}>My services <span>{services.length}</span></button>
              </div>

              {activeTab === "products" ? (
                <>
                  {deleteError && <div className="dashboard-empty-state" role="alert"><p>{deleteError}</p></div>}
                  {editProductSuccess && <div role="status" style={{ padding: "12px 16px", marginBottom: "12px", borderRadius: "10px", background: "#e8f8ee", color: "#166534" }}>{editProductSuccess}</div>}
                  {isAuthLoading || isLoadingProducts ? (
                    <div className="dashboard-empty-state" role="status"><h3>Loading your products…</h3><p>Please wait while we retrieve your listings.</p></div>
                  ) : productsError ? (
                    <div className="dashboard-empty-state" role="alert"><h3>Couldn't load your products</h3><p>{productsError}</p><button type="button" className="dashboard-primary-btn" onClick={() => void loadMyProducts()}>Try again</button></div>
                  ) : recentProducts.length ? (
                    <div className="dashboard-listing-list">
                      {recentProducts.map((product) => (
                        <article className="dashboard-listing-item" key={product.id}>
                          <div className="dashboard-listing-image">{product.image ? <img src={product.image} alt={product.name} /> : <span>🛍️</span>}</div>
                          <div className="dashboard-listing-info"><h3>{product.name}</h3><p>{product.category} · {product.condition}</p><span>Added {formatDate(product.createdAt)}</span></div>
                          <div className="dashboard-product-actions" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: "10px", minWidth: "150px" }}>
                            <strong className="dashboard-listing-price">{formatPrice(product.price)}</strong>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                              <button type="button" className="dashboard-outline-btn" onClick={() => openEditProduct(product)} aria-label={`Edit ${product.name}`}>Edit</button>
                              <button type="button" className="dashboard-outline-btn" onClick={() => setViewProduct(product)}>View</button>
                              <button type="button" className="dashboard-delete-btn" onClick={() => void handleDeleteProduct(product)} disabled={deletingProductId === product.id} aria-label={`Delete ${product.name}`}>{deletingProductId === product.id ? "Deleting…" : "Delete"}</button>
                            </div>
                          </div>
                        </article>
                      ))}
                      <Link to="/marketplace" className="dashboard-view-all">View marketplace →</Link>
                    </div>
                  ) : (
                    <div className="dashboard-empty-state"><div className="dashboard-empty-icon">🛍️</div><h3>No products yet</h3><p>Your published products will appear here. Start by listing something useful to another student.</p><Link to="/marketplace/create" className="dashboard-primary-btn">Create your first listing</Link></div>
                  )}
                </>
              ) : (
                isAuthLoading || isLoadingServices ? (
                  <div className="dashboard-empty-state" role="status"><h3>Loading your services…</h3><p>Please wait while we retrieve your services.</p></div>
                ) : servicesError ? (
                  <div className="dashboard-empty-state" role="alert"><h3>Couldn't load your services</h3><p>{servicesError}</p><button type="button" className="dashboard-primary-btn" onClick={() => void loadMyServices()}>Try again</button></div>
                ) : recentServices.length ? (
                  <div className="dashboard-listing-list">
                    {recentServices.map((service) => (
                      <article className="dashboard-listing-item" key={service.id}>
                        <div className="dashboard-listing-image">{service.image ? <img src={service.image} alt={service.title} /> : <span>🛠️</span>}</div>
                        <div className="dashboard-listing-info"><h3>{service.title}</h3><p>{service.category}</p><span>Added {formatDate(service.createdAt)}</span></div>
                        <strong className="dashboard-listing-price">{service.pricingModel === "Price on Request" ? "Price on request" : service.price !== null ? formatPrice(service.price) : "Contact for price"}</strong>
                      </article>
                    ))}
                    <Link to="/services" className="dashboard-view-all">View service directory →</Link>
                  </div>
                ) : (
                  <div className="dashboard-empty-state"><div className="dashboard-empty-icon">🛠️</div><h3>No services yet</h3><p>Services you publish will appear here so you can keep track of them.</p><Link to="/services/create" className="dashboard-primary-btn">Publish a service</Link></div>
                )
              )}
            </section>

            <aside className="dashboard-side-column">
              <section className="dashboard-panel dashboard-quick-actions">
                <div className="dashboard-panel-heading"><div><span className="dashboard-eyebrow">SHORTCUTS</span><h2>Quick actions</h2></div></div>
                <Link to="/marketplace/create" className="dashboard-action-item"><span className="dashboard-action-icon">＋</span><span><strong>Sell a product</strong><small>List an item for students</small></span><span className="dashboard-action-arrow">→</span></Link>
                <Link to="/services/create" className="dashboard-action-item"><span className="dashboard-action-icon">✦</span><span><strong>Offer a service</strong><small>Showcase your technical skills</small></span><span className="dashboard-action-arrow">→</span></Link>
                <Link to="/services" className="dashboard-action-item"><span className="dashboard-action-icon">⌕</span><span><strong>Find a technician</strong><small>Discover available services</small></span><span className="dashboard-action-arrow">→</span></Link>
                <Link to="/profile" className="dashboard-action-item"><span className="dashboard-action-icon">◉</span><span><strong>Update profile</strong><small>Keep your details up to date</small></span><span className="dashboard-action-arrow">→</span></Link>
              </section>

              <section className="dashboard-community-card">
                <div className="dashboard-community-symbol">✧</div><span className="dashboard-eyebrow">CAMPUS COMMUNITY</span><h2>Your skills can create opportunities.</h2><p>Connect with students, share useful products, and make your technical expertise easier to discover.</p><Link to="/services" className="dashboard-community-link">Discover services →</Link>
              </section>
            </aside>
          </div>

          <footer className="dashboard-footer"><p>CampusTechHub · Building a more connected campus community.</p><Link to="/services">Explore technical services</Link></footer>
        </div>
      </main>

      {editingProduct && (
        <div role="presentation" onClick={() => !isSavingProduct && setEditingProduct(null)} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0, 0, 0, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-product-title" onClick={(event) => event.stopPropagation()} style={{ width: "min(100%, 620px)", maxHeight: "90vh", overflowY: "auto", borderRadius: "16px", padding: "24px", background: "var(--card-bg, #fff)", color: "var(--text-color, #172033)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", marginBottom: "18px" }}><div><span className="dashboard-eyebrow">YOUR LISTING</span><h2 id="edit-product-title" style={{ marginTop: "6px" }}>Edit product</h2></div><button type="button" onClick={() => setEditingProduct(null)} disabled={isSavingProduct} aria-label="Close edit product form">✕</button></div>
            {editProductError && <div role="alert" style={{ padding: "12px 14px", marginBottom: "16px", borderRadius: "10px", background: "#fff0f0", color: "#b42318" }}>{editProductError}</div>}
            <form onSubmit={handleUpdateProduct} style={{ display: "grid", gap: "14px" }}>
              <label style={{ display: "grid", gap: "6px" }}>Product name<input name="name" type="text" required minLength={2} maxLength={100} defaultValue={editingProduct.name} /></label>
              <label style={{ display: "grid", gap: "6px" }}>Price (₦)<input name="price" type="number" required min="1" step="any" defaultValue={editingProduct.price} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                <label style={{ display: "grid", gap: "6px" }}>Category<select name="category" required defaultValue={editingProduct.category}><option value="Phones">Phones</option><option value="Electronics">Electronics</option><option value="Computers">Computers</option><option value="Fashion">Fashion</option><option value="Books & Education">Books &amp; Education</option><option value="Accessories">Accessories</option><option value="Other">Other</option></select></label>
                <label style={{ display: "grid", gap: "6px" }}>Condition<select name="condition" required defaultValue={editingProduct.condition}><option value="New">New</option><option value="Used">Used</option></select></label>
              </div>
              <label style={{ display: "grid", gap: "6px" }}>Location<input name="location" type="text" required maxLength={120} defaultValue={editingProduct.location} /></label>
              <label style={{ display: "grid", gap: "6px" }}>Description<textarea name="description" required minLength={10} maxLength={1500} rows={5} defaultValue={editingProduct.description} /></label>
              {editingProduct.image && <div><p style={{ marginBottom: "8px" }}>Current image</p><img src={editingProduct.image} alt={`Current ${editingProduct.name}`} style={{ width: "100%", maxHeight: "180px", objectFit: "contain", borderRadius: "10px" }} /></div>}
              <label style={{ display: "grid", gap: "6px" }}>Replace image (optional)<input name="image" type="file" accept="image/*" /><small>Leave this empty to keep the current image.</small></label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}><button type="button" className="dashboard-outline-btn" onClick={() => setEditingProduct(null)} disabled={isSavingProduct}>Cancel</button><button type="submit" className="dashboard-primary-btn" disabled={isSavingProduct}>{isSavingProduct ? "Saving changes…" : "Save changes"}</button></div>
            </form>
          </section>
        </div>
      )}

      {viewProduct && (
        <div role="presentation" onClick={() => setViewProduct(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0, 0, 0, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <section role="dialog" aria-modal="true" aria-labelledby="dashboard-product-title" onClick={(event) => event.stopPropagation()} style={{ width: "min(100%, 560px)", maxHeight: "90vh", overflowY: "auto", borderRadius: "16px", padding: "24px", background: "var(--card-bg, #fff)", color: "var(--text-color, #172033)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}><h2 id="dashboard-product-title">Product details</h2><button type="button" onClick={() => setViewProduct(null)} aria-label="Close product details">✕</button></div>
            {viewProduct.image && <img src={viewProduct.image} alt={viewProduct.name} style={{ width: "100%", maxHeight: "260px", objectFit: "contain", borderRadius: "10px", margin: "12px 0" }} />}
            <h3>{viewProduct.name}</h3><p><strong>{formatPrice(viewProduct.price)}</strong></p><p>{viewProduct.category} · {viewProduct.condition}</p><p><strong>Location:</strong> {viewProduct.location}</p><p>{viewProduct.description}</p><p><small>Published {formatDate(viewProduct.createdAt)}</small></p><button type="button" className="dashboard-primary-btn" onClick={() => setViewProduct(null)}>Close</button>
          </section>
        </div>
      )}
    </>
  );
}

export default Dashboard;
