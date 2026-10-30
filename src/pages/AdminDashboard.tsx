
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type AdminTab = "overview" | "users" | "products" | "services" | "reports";

type UserRole = "student" | "technician" | "admin";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTechnicians: number;
  totalProducts: number;
  totalServices: number;
  activeUsers: number;
  inactiveUsers: number;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  condition?: string;
  location: string;
  description: string;
  image?: { url?: string; publicId?: string } | string;
  seller?: { _id?: string; name?: string; email?: string } | string;
  status?: string;
  createdAt?: string;
}

interface Service {
  _id: string;
  id?: string;
  title: string;
  category: string;
  description: string;
  pricingModel?: string;
  price: number | null;
  location: string;
  image?: { url?: string; publicId?: string } | string;
  technician?: { _id?: string; name?: string; email?: string } | string;
  createdAt?: string;
}



const navigation: { id: AdminTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "users", label: "User management", icon: "♙" },
  { id: "products", label: "Products", icon: "▣" },
  { id: "services", label: "Services", icon: "⚒" },
  { id: "reports", label: "Reports", icon: "⚑" },
];

function formatDate(value?: string): string {
  if (!value) return "Recently added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently added";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getImageUrl(
  image?: { url?: string; publicId?: string } | string,
): string {
  if (typeof image === "string") return image;
  return image?.url || "";
}

function getOwnerName(
  owner?: { name?: string; email?: string } | string,
): string {
  if (!owner) return "Unknown";
  if (typeof owner === "string") return owner;
  return owner.name || owner.email || "Unknown";
}

function getRecordId(record: { _id?: string; id?: string }): string {
  return record._id || record.id || "";
}

async function readResponse<T>(
  response: Response,
): Promise<T & { success?: boolean; message?: string }> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data as T & { success?: boolean; message?: string };
}

function AdminDashboard() {
  const { user, token, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [listingSearch, setListingSearch] = useState("");
  const [userRole, setUserRole] = useState("All");

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }, []);

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });

      return readResponse<T>(response);
    },
    [token],
  );

  const loadAdminData = useCallback(async () => {
    if (!token) {
      setApiError("Your session is unavailable. Please log in again.");
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setApiError("");

    try {
      const [statsResult, usersResult, productsResult, servicesResult] =
        await Promise.all([
          request<{ success: boolean; stats: AdminStats }>("/admin/stats"),
          request<{ success: boolean; users: AdminUser[] }>("/admin/users"),
          request<{ success: boolean; products: Product[] }>("/admin/products"),
          request<{ success: boolean; services: Service[] }>("/admin/services"),
        ]);

      setStats(statsResult.stats);
      setUsers(usersResult.users || []);
      setProducts(productsResult.products || []);
      setServices(servicesResult.services || []);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to load administrator data.",
      );
    } finally {
      setDataLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== "admin") {
      setApiError("Administrator access is required.");
      setDataLoading(false);
      return;
    }

    void loadAdminData();
  }, [authLoading, user, loadAdminData]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.toLowerCase().trim();

    return users.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search) ||
        item.email.toLowerCase().includes(search);

      const matchesRole =
        userRole === "All" || item.role === userRole.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRole]);

  const filteredProducts = useMemo(() => {
    const search = listingSearch.toLowerCase().trim();

    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search),
    );
  }, [products, listingSearch]);

  const filteredServices = useMemo(() => {
    const search = listingSearch.toLowerCase().trim();

    return services.filter(
      (item) =>
        item.title.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search),
    );
  }, [services, listingSearch]);

  const updateUserStatus = async (target: AdminUser) => {
    const nextStatus = !target.isActive;
    const action = nextStatus ? "activate" : "deactivate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${target.name}'s account?`,
      )
    ) {
      return;
    }

    setBusyId(target._id);
    setApiError("");

    try {
      const result = await request<{
        success: boolean;
        message?: string;
        user?: AdminUser;
      }>(`/admin/users/${target._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextStatus }),
      });

      setUsers((current) =>
        current.map((item) =>
          item._id === target._id
            ? { ...item, ...(result.user || {}), isActive: nextStatus }
            : item,
        ),
      );

      setStats((current) => {
        if (!current) return current;

        return {
          ...current,
          activeUsers: current.activeUsers + (nextStatus ? 1 : -1),
          inactiveUsers: current.inactiveUsers + (nextStatus ? -1 : 1),
        };
      });

      showNotice(result.message || `Account ${action}d successfully.`);
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "Unable to update account.",
      );
    } finally {
      setBusyId("");
    }
  };

  const editProduct = async (product: Product) => {
    const name = window.prompt("Product name:", product.name);
    if (name === null) return;

    const description = window.prompt(
      "Product description:",
      product.description || "",
    );
    if (description === null) return;

    const priceText = window.prompt(
      "Product price in naira:",
      String(product.price),
    );
    if (priceText === null) return;

    const price = Number(priceText);

    if (
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      description.trim().length < 10 ||
      description.trim().length > 1500 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      showNotice(
        "Enter a product name (2–100 characters), description (10–1500 characters), and price greater than zero.",
      );
      return;
    }

    setBusyId(getRecordId(product));

    try {
      const result = await request<{
        success: boolean;
        message?: string;
        product?: Product;
      }>(`/admin/products/${getRecordId(product)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), description: description.trim(), price }),
      });

      setProducts((current) =>
        current.map((item) =>
          getRecordId(item) === getRecordId(product)
            ? { ...item, ...(result.product || {}), name: name.trim(), description: description.trim(), price }
            : item,
        ),
      );

      showNotice(result.message || "Product updated successfully.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update product.");
    } finally {
      setBusyId("");
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Permanently delete "${product.name}"?`)) return;

    const id = getRecordId(product);
    setBusyId(id);

    try {
      const result = await request<{ success: boolean; message?: string }>(
        `/admin/products/${id}`,
        { method: "DELETE" },
      );

      setProducts((current) => current.filter((item) => getRecordId(item) !== id));
      setStats((current) =>
        current ? { ...current, totalProducts: Math.max(0, current.totalProducts - 1) } : current,
      );

      showNotice(result.message || "Product deleted successfully.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to delete product.");
    } finally {
      setBusyId("");
    }
  };

  const editService = async (service: Service) => {
    const title = window.prompt("Service title:", service.title);
    if (title === null) return;

    const description = window.prompt(
      "Service description:",
      service.description || "",
    );
    if (description === null) return;

    const priceText = window.prompt(
      'Service price in naira (leave blank if price is on request):',
      service.price === null ? "" : String(service.price),
    );
    if (priceText === null) return;

    const price = priceText.trim() === "" ? null : Number(priceText);

    const isPriceOnRequest = service.pricingModel === "Price on Request";

    if (
      title.trim().length < 1 ||
      title.trim().length > 100 ||
      !description.trim() ||
      description.trim().length > 1500 ||
      (isPriceOnRequest && price !== null) ||
      (!isPriceOnRequest &&
        (price === null || !Number.isFinite(price) || price <= 0))
    ) {
      showNotice(
        isPriceOnRequest
          ? "For a Price on Request service, leave the price blank and enter a valid title and description."
          : "Enter a valid title and description, and a price greater than zero for this service.",
      );
      return;
    }

    const id = getRecordId(service);
    setBusyId(id);

    try {
      const result = await request<{
        success: boolean;
        message?: string;
        service?: Service;
      }>(`/admin/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price,
        }),
      });

      setServices((current) =>
        current.map((item) =>
          getRecordId(item) === id
            ? { ...item, ...(result.service || {}), title: title.trim(), description: description.trim(), price }
            : item,
        ),
      );

      showNotice(result.message || "Service updated successfully.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update service.");
    } finally {
      setBusyId("");
    }
  };

  const deleteService = async (service: Service) => {
    if (!window.confirm(`Permanently delete "${service.title}"?`)) return;

    const id = getRecordId(service);
    setBusyId(id);

    try {
      const result = await request<{ success: boolean; message?: string }>(
        `/admin/services/${id}`,
        { method: "DELETE" },
      );

      setServices((current) => current.filter((item) => getRecordId(item) !== id));
      setStats((current) =>
        current ? { ...current, totalServices: Math.max(0, current.totalServices - 1) } : current,
      );

      showNotice(result.message || "Service deleted successfully.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to delete service.");
    } finally {
      setBusyId("");
    }
  };

  const totalUsers = stats?.totalUsers ?? users.length;
  const totalListings = products.length + services.length;

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="admin-dashboard">
          <div className="admin-shell">
            <p>Loading administrator session...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <>
        <Navbar />
        <main className="admin-dashboard">
          <div className="admin-shell">
            <div className="admin-notice" role="alert">
              Administrator access is required. Please sign in with an administrator account.
            </div>
            <Link to="/login" className="admin-outline-button">Go to login</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="admin-dashboard">
        <div className="admin-shell">
          <header className="admin-welcome">
            <div>
              <span className="admin-eyebrow">CAMPUS TECH HUB</span>
              <h1>Admin dashboard</h1>
              <p>Monitor your platform, review listings, and manage campus activities.</p>
            </div>

            <div className="admin-header-actions">
              <span className="admin-demo-badge">
                <span className="admin-status-dot" />
                {dataLoading ? "Loading data" : "Backend dashboard"}
              </span>
              <button
                type="button"
                className="admin-outline-button"
                onClick={() => void loadAdminData()}
                disabled={dataLoading}
              >
                {dataLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
              <Link className="admin-outline-button" to="/">View website ↗</Link>
            </div>
          </header>

          {notice && <div className="admin-notice" role="status">{notice}</div>}

          {apiError && (
            <div className="admin-notice" role="alert">
              <span>{apiError}</span>
              <button type="button" className="admin-text-button" onClick={() => void loadAdminData()}>
                Retry
              </button>
            </div>
          )}

          <div className="admin-layout">
            <aside className="admin-sidebar">
              <div className="admin-sidebar-heading">WORKSPACE</div>

              <nav aria-label="Admin navigation">
                {navigation.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setListingSearch("");
                    }}
                  >
                    <span className="admin-nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    {activeTab === item.id && <span className="admin-nav-arrow">›</span>}
                  </button>
                ))}
              </nav>

              <div className="admin-sidebar-bottom">
                <div className="admin-sidebar-avatar">
                  {user.name?.charAt(0).toUpperCase() || "A"}
                </div>
                <div>
                  <strong>{user.name || "Platform Admin"}</strong>
                  <span>Administrator</span>
                </div>
              </div>
            </aside>

            <section className="admin-content">
              {activeTab === "overview" && (
                <>
                  <div className="admin-section-heading">
                    <div>
                      <h2>Platform overview</h2>
                      <p>Here's what's happening across your platform.</p>
                    </div>
                    <span className="admin-date-label">
                      {new Date().toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="admin-stat-grid">
                    <StatCard label="Total users" value={dataLoading ? "..." : totalUsers} detail="Registered platform accounts" icon="♙" tone="blue" />
                    <StatCard label="Products" value={dataLoading ? "..." : stats?.totalProducts ?? products.length} detail="Marketplace products" icon="▣" tone="purple" />
                    <StatCard label="Services" value={dataLoading ? "..." : stats?.totalServices ?? services.length} detail="Technician services" icon="⚒" tone="green" />
                    <StatCard label="Total listings" value={dataLoading ? "..." : totalListings} detail="Products and services combined" icon="▤" tone="orange" />
                  </div>

                  <div className="admin-overview-grid">
                    <article className="admin-panel">
                      <div className="admin-panel-heading">
                        <div>
                          <h3>Recent products</h3>
                          <p>Latest products retrieved from the database</p>
                        </div>
                        <button type="button" className="admin-text-button" onClick={() => setActiveTab("products")}>View all →</button>
                      </div>

                      {products.length === 0 ? (
                        <div className="admin-empty-state">
                          <span>▣</span>
                          <strong>No products found</strong>
                          <p>Products created on the platform will appear here.</p>
                        </div>
                      ) : (
                        <div className="admin-recent-list">
                          {[...products]
                            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                            .slice(0, 4)
                            .map((product) => (
                              <div className="admin-recent-item" key={getRecordId(product)}>
                                <div className="admin-product-thumb">
                                  {getImageUrl(product.image) ? (
                                    <img src={getImageUrl(product.image)} alt={product.name} />
                                  ) : "▣"}
                                </div>
                                <div className="admin-recent-info">
                                  <strong>{product.name}</strong>
                                  <span>{product.category} · {formatDate(product.createdAt)}</span>
                                </div>
                                <strong className="admin-price">₦{product.price.toLocaleString("en-NG")}</strong>
                              </div>
                            ))}
                        </div>
                      )}
                    </article>

                    <article className="admin-panel">
                      <div className="admin-panel-heading">
                        <div><h3>Quick actions</h3><p>Navigate to platform features</p></div>
                      </div>
                      <div className="admin-quick-actions">
                        <QuickAction icon="♙" tone="blue" title="Manage users" detail="Activate or deactivate accounts" onClick={() => setActiveTab("users")} />
                        <QuickAction icon="▣" tone="purple" title="Manage products" detail="Edit or remove listings" onClick={() => setActiveTab("products")} />
                        <QuickAction icon="⚒" tone="green" title="Manage services" detail="Edit or remove services" onClick={() => setActiveTab("services")} />
                        <Link to="/marketplace" className="admin-quick-action">
                          <span className="admin-quick-icon orange">↗</span>
                          <span><strong>Open marketplace</strong><small>See the public marketplace</small></span>
                          <span className="admin-action-arrow">→</span>
                        </Link>
                      </div>
                    </article>
                  </div>

                  <div className="admin-demo-notice">
                    <strong>Database status:</strong> This dashboard requests users, products, services, and statistics from your backend API.
                  </div>
                </>
              )}

              {activeTab === "users" && (
                <>
                  <div className="admin-section-heading">
                    <div><h2>User management</h2><p>Review accounts and manage student and technician access.</p></div>
                    <span className="admin-count-badge">{dataLoading ? "Loading..." : `${filteredUsers.length} users`}</span>
                  </div>

                  <div className="admin-toolbar">
                    <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search name or email..." aria-label="Search users" />
                    <select value={userRole} onChange={(event) => setUserRole(event.target.value)} aria-label="Filter users by role">
                      <option value="All">All roles</option>
                      <option value="Student">Students</option>
                      <option value="Technician">Technicians</option>
                      <option value="Admin">Administrators</option>
                    </select>
                  </div>

                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr><th>User</th><th>Role</th><th>Status</th><th>Account ID</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((item) => {
                          const isSelf = item._id === user.id;
                          const isBusy = busyId === item._id;
                          const protectedAccount = item.role === "admin";

                          return (
                            <tr key={item._id}>
                              <td>
                                <div className="admin-table-user">
                                  <span>{item.name.split(" ").map((part) => part[0] || "").join("").slice(0, 2)}</span>
                                  <div><strong>{item.name}</strong><small>{item.email}</small></div>
                                </div>
                              </td>
                              <td><span className={`admin-role-badge ${item.role}`}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</span></td>
                              <td><span className={`admin-status-badge ${item.isActive ? "active" : "inactive"}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
                              <td>{item._id}</td>
                              <td>
                                {protectedAccount ? (
                                  <span className="admin-footnote">{isSelf ? "Your account" : "Protected"}</span>
                                ) : (
                                  <button
                                    type="button"
                                    className="admin-primary-button"
                                    disabled={isBusy || dataLoading}
                                    onClick={() => void updateUserStatus(item)}
                                  >
                                    {isBusy ? "Updating..." : item.isActive ? "Deactivate" : "Activate"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {!dataLoading && filteredUsers.length === 0 && (
                      <p className="admin-table-empty">{apiError ? "User data could not be loaded." : "No users match your search."}</p>
                    )}
                  </div>

                  <p className="admin-footnote">Administrator accounts are protected from changes through this control. Deactivated accounts should no longer be able to use protected routes.</p>
                </>
              )}

              {activeTab === "products" && (
                <>
                  <div className="admin-section-heading">
                    <div><h2>Product management</h2><p>Review and manage marketplace listings from the database.</p></div>
                    <Link to="/marketplace" className="admin-outline-button">Open marketplace ↗</Link>
                  </div>

                  <div className="admin-toolbar">
                    <input value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder="Search product name or category..." aria-label="Search products" />
                    <span className="admin-count-badge">{filteredProducts.length} products</span>
                  </div>

                  <div className="admin-listing-grid">
                    {filteredProducts.map((product) => (
                      <ProductAdminCard
                        key={getRecordId(product)}
                        product={product}
                        busy={busyId === getRecordId(product)}
                        onEdit={() => void editProduct(product)}
                        onDelete={() => void deleteProduct(product)}
                      />
                    ))}
                  </div>

                  {!dataLoading && filteredProducts.length === 0 && (
                    <EmptyState icon="▣" title="No products found" detail="Products in the database will appear here." />
                  )}
                </>
              )}

              {activeTab === "services" && (
                <>
                  <div className="admin-section-heading">
                    <div><h2>Service management</h2><p>Review and manage technician services from the database.</p></div>
                    <Link to="/services" className="admin-outline-button">Open services ↗</Link>
                  </div>

                  <div className="admin-toolbar">
                    <input value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder="Search service title or category..." aria-label="Search services" />
                    <span className="admin-count-badge">{filteredServices.length} services</span>
                  </div>

                  <div className="admin-listing-grid">
                    {filteredServices.map((service) => (
                      <ServiceAdminCard
                        key={getRecordId(service)}
                        service={service}
                        busy={busyId === getRecordId(service)}
                        onEdit={() => void editService(service)}
                        onDelete={() => void deleteService(service)}
                      />
                    ))}
                  </div>

                  {!dataLoading && filteredServices.length === 0 && (
                    <EmptyState icon="⚒" title="No services found" detail="Services in the database will appear here." />
                  )}
                </>
              )}

              {activeTab === "reports" && (
                <>
                  <div className="admin-section-heading">
                    <div><h2>Reports & moderation</h2><p>Future workspace for handling reported users and content.</p></div>
                    <span className="admin-count-badge">Coming later</span>
                  </div>
                  <div className="admin-report-placeholder">
                    <div className="admin-report-icon">⚑</div>
                    <h3>Keep the campus community safe</h3>
                    <p>This section can later support reported users, inappropriate listings, and moderation decisions.</p>
                    <button className="admin-primary-button" onClick={() => showNotice("Report handling is planned for a later stage.")}>Preview moderation status</button>
                  </div>
                </>
              )}
            </section>
          </div>

          <footer className="admin-footer">
            <span>Campus Technology Hub</span>
            <span>Administration · Connected to backend APIs</span>
          </footer>
        </div>
      </main>
    </>
  );
}

function StatCard({
  label, value, detail, icon, tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone: string;
}) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <span>{label}</span>
        <span className={`admin-stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function QuickAction({
  icon, tone, title, detail, onClick,
}: {
  icon: string;
  tone: string;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="admin-quick-action">
      <span className={`admin-quick-icon ${tone}`}>{icon}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <span className="admin-action-arrow">→</span>
    </button>
  );
}

function ProductAdminCard({
  product, busy, onEdit, onDelete,
}: {
  product: Product;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const image = getImageUrl(product.image);

  return (
    <article className="admin-listing-card">
      <div className="admin-listing-image">
        {image ? <img src={image} alt={product.name} /> : <span>▣</span>}
      </div>
      <div className="admin-listing-body">
        <span className="admin-listing-category">{product.category}</span>
        <h3>{product.name}</h3>
        <strong className="admin-price">₦{product.price.toLocaleString("en-NG")}</strong>
        <p>{product.location}</p>
        <p className="admin-footnote">Seller: {getOwnerName(product.seller)}</p>
        <span className="admin-listing-date">Added {formatDate(product.createdAt)}</span>
        <div className="admin-card-actions">
          <button type="button" className="admin-primary-button" disabled={busy} onClick={onEdit}>{busy ? "Working..." : "Edit"}</button>
          <button type="button" className="admin-outline-button" disabled={busy} onClick={onDelete}>Delete</button>
        </div>
      </div>
    </article>
  );
}

function ServiceAdminCard({
  service, busy, onEdit, onDelete,
}: {
  service: Service;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const image = getImageUrl(service.image);

  return (
    <article className="admin-listing-card">
      <div className="admin-listing-image">
        {image ? <img src={image} alt={service.title} /> : <span>⚒</span>}
      </div>
      <div className="admin-listing-body">
        <span className="admin-listing-category">{service.category}</span>
        <h3>{service.title}</h3>
        <strong className="admin-price">
          {service.pricingModel === "Price on Request" || service.price === null
            ? "Price on request"
            : `₦${service.price.toLocaleString("en-NG")}`}
        </strong>
        <p>{service.location}</p>
        <p className="admin-footnote">Technician: {getOwnerName(service.technician)}</p>
        <span className="admin-listing-date">Added {formatDate(service.createdAt)}</span>
        <div className="admin-card-actions">
          <button type="button" className="admin-primary-button" disabled={busy} onClick={onEdit}>{busy ? "Working..." : "Edit"}</button>
          <button type="button" className="admin-outline-button" disabled={busy} onClick={onDelete}>Delete</button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  icon, title, detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="admin-empty-state admin-large-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

export default AdminDashboard