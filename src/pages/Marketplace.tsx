
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import type { ProductListing } from "../utils/storage";

type Product = ProductListing & {
    sellerEmail?: string;
    sellerPhone?: string;
};
const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ApiProduct {
    _id: string;
    name: string;
    price: number;
    category: string;
    condition: string;
    seller:
    | string
    | {
        _id?: string;
        name?: string;
        email?: string;
        phone?: string;
    }; location: string;
    description: string;
    image?: string | { url?: string; publicId?: string } | null;
    createdAt: string;
}

interface ProductsResponse {
    success: boolean;
    products: ApiProduct[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    message?: string;
}

type SortOption = "newest" | "price-low" | "price-high";


function formatPrice(price: number) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
    }).format(price);
}
function getWhatsAppLink(phone: string, productName: string) {
    // Remove spaces and common phone-number formatting characters.
    let number = phone.replace(/[^\d+]/g, "");

    // Convert a Nigerian local number, such as 08012345678,
    // into international format: 2348012345678.
    if (number.startsWith("0")) {
        number = `234${number.slice(1)}`;
    } else if (number.startsWith("+")) {
        number = number.slice(1);
    }

    // WhatsApp international links require digits only.
    if (!/^\d{7,15}$/.test(number)) {
        return null;
    }

    const message = `Hello, I'm interested in your product: ${productName}. Is it still available?`;

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function normalizeProduct(product: ApiProduct): Product {
    const seller =
        typeof product.seller === "string"
            ? product.seller
            : product.seller?.name || "Seller";

    const sellerEmail =
        typeof product.seller === "string"
            ? undefined
            : product.seller?.email;

    const sellerPhone =
        typeof product.seller === "string"
            ? undefined
            : product.seller?.phone;

    const image =
        typeof product.image === "string"
            ? product.image
            : product.image?.url || "";

    return {
        id: product._id,
        name: product.name,
        price: Number(product.price),
        category: product.category,
        condition: product.condition,
        seller,
        sellerEmail,
        sellerPhone,
        location: product.location,
        description: product.description,
        image,
        createdAt: product.createdAt,
    };
}

function Marketplace() {
    const { user, isAuthenticated, isLoading } = useAuth();

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [sort, setSort] = useState<SortOption>("newest");
    const [selectedProduct, setSelectedProduct] =
        useState<Product | null>(null);

    const [savedProducts, setSavedProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function fetchProducts() {
            setIsLoadingProducts(true);
            setProductsError("");

            try {
                const allProducts: Product[] = [];
                let page = 1;
                let totalPages = 1;

                do {
                    const response = await fetch(
                        `${API_BASE_URL}/products?page=${page}&limit=50`,
                    );

                    const data =
                        (await response.json()) as ProductsResponse;

                    if (!response.ok || !data.success) {
                        throw new Error(
                            data.message ||
                            "Unable to retrieve marketplace products.",
                        );
                    }

                    allProducts.push(
                        ...(data.products || []).map(normalizeProduct),
                    );

                    totalPages = data.pagination?.totalPages ?? 1;
                    page += 1;
                } while (page <= totalPages);

                if (!cancelled) {
                    setSavedProducts(allProducts);
                }
            } catch (error) {
                if (!cancelled) {
                    setProductsError(
                        error instanceof Error
                            ? error.message
                            : "Unable to load products. Please try again.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingProducts(false);
                }
            }
        }

        void fetchProducts();

        function handleFocus() {
            void fetchProducts();
        }

        window.addEventListener("focus", handleFocus);

        return () => {
            cancelled = true;
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    const products = savedProducts;

    const categories = useMemo(() => {
        const availableCategories = Array.from(
            new Set(
                products
                    .map((product) => product.category.trim())
                    .filter(Boolean),
            ),
        ).sort((a, b) => a.localeCompare(b));

        return ["All", ...availableCategories];
    }, [products]);

    const filteredProducts = useMemo(() => {
        const result = products.filter((product) => {
            const matchesSearch = [
                product.name,
                product.category,
                product.seller,
                product.description,
                product.location,
            ]
                .join(" ")
                .toLowerCase()
                .includes(search.trim().toLowerCase());

            const matchesCategory =
                category === "All" || product.category === category;

            return matchesSearch && matchesCategory;
        });

        return [...result].sort((a, b) => {
            if (sort === "price-low") {
                return a.price - b.price;
            }

            if (sort === "price-high") {
                return b.price - a.price;
            }

            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
        });
    }, [products, search, category, sort]);

    return (
        <>
            <Navbar />

            <main className="marketplace-page">
                <section className="marketplace-hero">
                    <div className="marketplace-container marketplace-hero-inner">
                        <div className="marketplace-hero-copy">
                            <span className="section-kicker">
                                YOUR CAMPUS MARKETPLACE
                            </span>

                            <h1>
                                Find what you need.
                                <br />
                                <span>Sell what you don't.</span>
                            </h1>

                            <p>
                                Discover products from your campus community.
                                Find great deals, explore useful essentials, and
                                connect directly with other students.
                            </p>

                            <div className="marketplace-hero-actions">
                                <a
                                    href="#product-listings"
                                    className="button button-primary"
                                >
                                    Explore products
                                </a>

                                <Link
                                    to="/marketplace/create"
                                    className="marketplace-secondary-button"
                                >
                                    Sell a product
                                </Link>
                            </div>

                            <div className="marketplace-trust-note">
                                <span aria-hidden="true">✓</span>
                                A convenient place to buy and sell on campus
                            </div>
                        </div>

                        <div className="marketplace-hero-visual">
                            <div className="marketplace-hero-image-wrap">
                                <img
                                    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&auto=format&fit=crop"
                                    alt="Laptop and workspace"
                                />

                                <div className="marketplace-floating-card">
                                    <span className="marketplace-floating-icon">
                                        ✦
                                    </span>

                                    <div>
                                        <strong>Discover more</strong>
                                        <p>Explore campus listings</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    className="marketplace-content marketplace-container"
                    id="product-listings"
                >
                    <div className="marketplace-section-heading">
                        <div>
                            <span className="section-kicker">
                                THE MARKETPLACE
                            </span>

                            <h2>Explore products</h2>

                            <p>
                                Find useful items listed by members of your
                                campus community.
                            </p>
                        </div>

                        <Link
                            to="/marketplace/create"
                            className="button button-primary marketplace-create-button"
                        >
                            <span aria-hidden="true">＋</span> Create listing
                        </Link>
                    </div>

                    <div className="marketplace-toolbar">
                        <label className="marketplace-search">
                            <span aria-hidden="true">⌕</span>

                            <input
                                type="search"
                                placeholder="Search products, categories or sellers..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                aria-label="Search products"
                            />

                            {search && (
                                <button
                                    type="button"
                                    className="marketplace-clear-search"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </label>

                        <label className="marketplace-sort">
                            <span>Sort by</span>

                            <select
                                value={sort}
                                onChange={(event) =>
                                    setSort(
                                        event.target.value as SortOption,
                                    )
                                }
                                aria-label="Sort products"
                            >
                                <option value="newest">Newest first</option>
                                <option value="price-low">
                                    Price: Low to high
                                </option>
                                <option value="price-high">
                                    Price: High to low
                                </option>
                            </select>
                        </label>
                    </div>

                    <div
                        className="marketplace-categories"
                        aria-label="Product categories"
                    >
                        {categories.map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`marketplace-category ${category === item ? "active" : ""
                                    }`}
                                onClick={() => setCategory(item)}
                                aria-pressed={category === item}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className="marketplace-results-heading">
                        <h3>
                            {category === "All"
                                ? "Available products"
                                : category}
                        </h3>

                        <span>
                            {filteredProducts.length}{" "}
                            {filteredProducts.length === 1
                                ? "product"
                                : "products"}
                        </span>
                    </div>

                    {isLoadingProducts ? (
                        <div
                            className="marketplace-empty-state"
                            role="status"
                        >
                            <h3>Loading products...</h3>
                            <p>
                                Please wait while we retrieve marketplace
                                listings.
                            </p>
                        </div>
                    ) : productsError ? (
                        <div className="marketplace-empty-state">
                            <h3>Unable to load marketplace products</h3>
                            <p>{productsError}</p>

                            <button
                                type="button"
                                className="button button-primary"
                                onClick={() => window.location.reload()}
                            >
                                Try again
                            </button>
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <div className="marketplace-product-grid">
                            {filteredProducts.map((product) => (
                                <article
                                    className="marketplace-product-card"
                                    key={product.id}
                                >
                                    <button
                                        type="button"
                                        className="marketplace-product-image"
                                        onClick={() =>
                                            setSelectedProduct(product)
                                        }
                                        aria-label={`View ${product.name} details`}
                                    >
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                            />
                                        ) : (
                                            <span>No image available</span>
                                        )}

                                        <span
                                            className={`marketplace-condition ${product.condition === "New"
                                                ? "condition-new"
                                                : ""
                                                }`}
                                        >
                                            {product.condition}
                                        </span>
                                    </button>

                                    <div className="marketplace-product-info">
                                        <span className="marketplace-product-category">
                                            {product.category}
                                        </span>

                                        <h3>
                                            <button
                                                type="button"
                                                className="marketplace-product-title"
                                                onClick={() =>
                                                    setSelectedProduct(product)
                                                }
                                            >
                                                {product.name}
                                            </button>
                                        </h3>

                                        <p className="marketplace-product-price">
                                            {formatPrice(product.price)}
                                        </p>

                                        <div className="marketplace-product-meta">
                                            <span>◉ {product.seller}</span>
                                            <span>⌖ {product.location}</span>
                                        </div>

                                        <button
                                            type="button"
                                            className="marketplace-view-button"
                                            onClick={() =>
                                                setSelectedProduct(product)
                                            }
                                        >
                                            View details{" "}
                                            <span aria-hidden="true">→</span>
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="marketplace-empty-state">
                            <span
                                className="marketplace-empty-icon"
                                aria-hidden="true"
                            >
                                ⌕
                            </span>

                            <h3>No products found</h3>

                            <p>
                                Try another search term or choose a different
                                category.
                            </p>

                            <button
                                type="button"
                                className="button button-primary"
                                onClick={() => {
                                    setSearch("");
                                    setCategory("All");
                                }}
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </section>

                <section className="marketplace-services-banner marketplace-container">
                    <div>
                        <span className="section-kicker">
                            MORE FOR YOUR CAMPUS
                        </span>

                        <h2>Looking for a skilled technician?</h2>

                        <p>
                            Discover phone repairers, graphics designers, web
                            developers, and other technical service providers.
                        </p>
                    </div>

                    <Link to="/services" className="button button-primary">
                        Explore services{" "}
                        <span aria-hidden="true">→</span>
                    </Link>
                </section>

                <footer className="marketplace-footer">
                    <div className="marketplace-container">
                        <p>
                            © {new Date().getFullYear()} Campus Technology Hub.
                            Connecting campus communities.
                        </p>
                    </div>
                </footer>
            </main>

            {selectedProduct && (
                <div
                    className="marketplace-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedProduct(null);
                        }
                    }}
                >
                    <section
                        className="marketplace-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="marketplace-modal-title"
                    >
                        <button
                            type="button"
                            className="marketplace-modal-close"
                            onClick={() => {
                                setSelectedProduct(null);
                            }}
                            aria-label="Close product details"
                        >
                            ×
                        </button>

                        {selectedProduct.image && (
                            <img
                                className="marketplace-modal-image"
                                src={selectedProduct.image}
                                alt={selectedProduct.name}
                            />
                        )}

                        <div className="marketplace-modal-content">
                            <span className="marketplace-product-category">
                                {selectedProduct.category}
                            </span>

                            <h2 id="marketplace-modal-title">
                                {selectedProduct.name}
                            </h2>

                            <p className="marketplace-product-price">
                                {formatPrice(selectedProduct.price)}
                            </p>

                            <p className="marketplace-modal-description">
                                {selectedProduct.description}
                            </p>

                            <div className="marketplace-modal-details">
                                <p>
                                    <strong>Condition:</strong>{" "}
                                    {selectedProduct.condition}
                                </p>

                                <p>
                                    <strong>Seller:</strong>{" "}
                                    {selectedProduct.seller}
                                </p>

                                <p>
                                    <strong>Location:</strong>{" "}
                                    {selectedProduct.location}
                                </p>
                            </div>
                            {!isLoading && !isAuthenticated && (
                                <>
                                    <Link
                                        to="/login"
                                        state={{
                                            from: "/marketplace",
                                            productId: selectedProduct.id,
                                        }}
                                        className="button button-primary marketplace-contact-button"
                                    >
                                        Sign in to contact seller
                                    </Link>

                                    <p className="marketplace-modal-note">
                                        Sign in to continue with contacting the seller.
                                    </p>
                                </>
                            )}

                            {!isLoading && isAuthenticated && user && (
                                <div className="marketplace-seller-contact">
                                    <h3>Contact seller</h3>

                                    <div className="marketplace-contact-actions">
                                        {selectedProduct.sellerEmail && (
                                            <a
                                                className="button button-primary marketplace-contact-button"
                                                href={`mailto:${selectedProduct.sellerEmail}?subject=${encodeURIComponent(
                                                    `Marketplace enquiry: ${selectedProduct.name}`,
                                                )}`}
                                            >
                                                Email seller
                                            </a>
                                        )}

                                        {selectedProduct.sellerPhone && (
                                            <a
                                                className="button marketplace-contact-button"
                                                href={`tel:${selectedProduct.sellerPhone.replace(/[^\d+]/g, "")}`}
                                            >
                                                Call seller
                                            </a>
                                        )}

                                        {selectedProduct.sellerPhone &&
                                            getWhatsAppLink(
                                                selectedProduct.sellerPhone,
                                                selectedProduct.name,
                                            ) && (
                                                <a
                                                    className="button marketplace-contact-button"
                                                    href={
                                                        getWhatsAppLink(
                                                            selectedProduct.sellerPhone,
                                                            selectedProduct.name,
                                                        )!
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    WhatsApp seller
                                                </a>
                                            )}
                                    </div>

                                    {!selectedProduct.sellerEmail &&
                                        !selectedProduct.sellerPhone && (
                                            <p className="marketplace-modal-note">
                                                Contact details are not available for this seller.
                                            </p>
                                        )}
                                </div>
                            )}

                            {isLoading && (
                                <p className="marketplace-modal-note">
                                    Checking your sign-in status...
                                </p>
                            )}


                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

export default Marketplace;

