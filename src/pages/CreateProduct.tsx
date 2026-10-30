import {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type ProductCondition = "New" | "Used";

interface ProductResponse {
    success: boolean;
    message?: string;
    product?: {
        _id: string;
        name: string;
        price: number;
        category: string;
    };
    errors?: Array<{
        field: string;
        message: string;
    }>;
}

const categories = [
    "Phones",
    "Electronics",
    "Computers",
    "Fashion",
    "Books & Education",
    "Accessories",
    "Other",
];

function formatPrice(price: number) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
    }).format(price);
}

function CreateProduct() {
    const navigate = useNavigate();
    const { user, token, isLoading: authLoading } = useAuth();

    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("Phones");
    const [condition, setCondition] =
        useState<ProductCondition>("Used");
    const [location, setLocation] =
        useState("University of Ilorin");
    const [description, setDescription] = useState("");

    // Keep the selected file separate from its temporary preview URL.
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [image, setImage] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Release temporary preview URLs when the selected image changes.
    useEffect(() => {
        if (!image) return;

        return () => {
            URL.revokeObjectURL(image);
        };
    }, [image]);

    function handleImageChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0];

        if (!file) return;

        setError("");
        setSuccess("");

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                "Please select a JPEG, PNG, or WebP image.",
            );
            event.target.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError(
                "Please choose an image smaller than 2 MB.",
            );
            event.target.value = "";
            return;
        }

        setImageFile(file);
        setImage(URL.createObjectURL(file));
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (authLoading) {
            setError(
                "Please wait while we verify your account.",
            );
            return;
        }

        if (!user || !token) {
            setError(
                "You must sign in before publishing a product.",
            );
            return;
        }

        const numericPrice = Number(price);

        if (name.trim().length < 2) {
            setError(
                "The product name must contain at least 2 characters.",
            );
            return;
        }

        if (name.trim().length > 100) {
            setError(
                "The product name cannot exceed 100 characters.",
            );
            return;
        }

        if (
            !price ||
            !Number.isFinite(numericPrice) ||
            numericPrice <= 0
        ) {
            setError(
                "Enter a valid price greater than zero.",
            );
            return;
        }

        if (!categories.includes(category)) {
            setError(
                "Please select a valid product category.",
            );
            return;
        }

        if (!location.trim()) {
            setError(
                "Enter the product location.",
            );
            return;
        }

        if (location.trim().length > 120) {
            setError(
                "The product location cannot exceed 120 characters.",
            );
            return;
        }

        if (description.trim().length < 10) {
            setError(
                "The description must contain at least 10 characters.",
            );
            return;
        }

        if (description.trim().length > 1500) {
            setError(
                "The description cannot exceed 1500 characters.",
            );
            return;
        }

        setIsSubmitting(true);

        try {
            // Multipart form data supports both text fields and an image.
            const formData = new FormData();

            formData.append("name", name.trim());
            formData.append("price", String(numericPrice));
            formData.append("category", category);
            formData.append("condition", condition);
            formData.append("location", location.trim());
            formData.append("description", description.trim());

            if (imageFile) {
                formData.append("image", imageFile);
            }

            const response = await fetch(
                `${API_BASE_URL}/products`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                },
            );

            const data: ProductResponse =
                await response.json();

            if (
                !response.ok ||
                !data.success ||
                !data.product
            ) {
                const validationMessage = data.errors
                    ?.map((item) => item.message)
                    .join(" ");

                throw new Error(
                    validationMessage ||
                    data.message ||
                    "Unable to publish your product.",
                );
            }

            setSuccess(
                data.message ||
                "Your product has been published successfully.",
            );

            // The backend has saved the product.
            // Navigate to the Marketplace after displaying confirmation.
            window.setTimeout(() => {
                navigate("/marketplace");
            }, 1000);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while publishing your product.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleRemoveImage() {
        setImageFile(null);
        setImage("");

        const fileInput = document.getElementById(
            "product-image",
        ) as HTMLInputElement | null;

        if (fileInput) {
            fileInput.value = "";
        }
    }

    if (authLoading) {
        return (
            <>
                <Navbar />

                <main className="create-product-page">
                    <div className="create-product-container">
                        <p role="status">
                            Checking your account...
                        </p>
                    </div>
                </main>
            </>
        );
    }

    if (!user || !token) {
        return (
            <>
                <Navbar />

                <main className="create-product-page">
                    <div className="create-product-container">
                        <header className="create-product-heading">
                            <span className="section-kicker">
                                CAMPUS MARKETPLACE
                            </span>

                            <h1>Sign in to sell</h1>

                            <p>
                                Please sign in to your account
                                before publishing a product listing.
                            </p>
                        </header>

                        <Link
                            to="/login"
                            className="button button-primary"
                        >
                            Sign in to continue
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />

            <main className="create-product-page">
                <div className="create-product-container">
                    <Link
                        to="/marketplace"
                        className="create-product-back"
                    >
                        <span aria-hidden="true">←</span>{" "}
                        Back to marketplace
                    </Link>

                    <header className="create-product-heading">
                        <span className="section-kicker">
                            CAMPUS MARKETPLACE
                        </span>

                        <h1>List a product for sale</h1>

                        <p>
                            Share something useful with your campus
                            community. Provide clear details to help
                            buyers understand what you're offering.
                        </p>
                    </header>

                    <div className="create-product-layout">
                        <form
                            className="create-product-form"
                            onSubmit={handleSubmit}
                        >
                            {/* SECTION 1: PRODUCT INFORMATION */}
                            <section className="create-product-section">
                                <div className="create-product-section-heading">
                                    <span className="create-product-step">
                                        01
                                    </span>

                                    <div>
                                        <h2>Product information</h2>
                                        <p>
                                            Start with the essential details.
                                        </p>
                                    </div>
                                </div>

                                <div className="create-product-field">
                                    <label htmlFor="product-name">
                                        Product name <span>*</span>
                                    </label>

                                    <input
                                        id="product-name"
                                        type="text"
                                        placeholder="e.g. Samsung Galaxy A14"
                                        value={name}
                                        onChange={(event) =>
                                            setName(event.target.value)
                                        }
                                        maxLength={100}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="create-product-field-row">
                                    <div className="create-product-field">
                                        <label htmlFor="product-category">
                                            Category <span>*</span>
                                        </label>

                                        <select
                                            id="product-category"
                                            value={category}
                                            onChange={(event) =>
                                                setCategory(event.target.value)
                                            }
                                            required
                                            disabled={isSubmitting}
                                        >
                                            {categories.map((item) => (
                                                <option
                                                    key={item}
                                                    value={item}
                                                >
                                                    {item}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="create-product-field">
                                        <label htmlFor="product-condition">
                                            Condition <span>*</span>
                                        </label>

                                        <select
                                            id="product-condition"
                                            value={condition}
                                            onChange={(event) =>
                                                setCondition(
                                                    event.target.value as ProductCondition,
                                                )
                                            }
                                            required
                                            disabled={isSubmitting}
                                        >
                                            <option value="New">
                                                New
                                            </option>

                                            <option value="Used">
                                                Used
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="create-product-field">
                                    <label htmlFor="product-price">
                                        Selling price (₦) <span>*</span>
                                    </label>

                                    <div className="create-product-price-input">
                                        <span>₦</span>

                                        <input
                                            id="product-price"
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="Enter your price"
                                            value={price}
                                            onChange={(event) =>
                                                setPrice(event.target.value)
                                            }
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    {price && Number(price) > 0 && (
                                        <small className="create-product-helper">
                                            Your price:{" "}
                                            {formatPrice(Number(price))}
                                        </small>
                                    )}
                                </div>
                            </section>

                            {/* SECTION 2: DESCRIPTION */}
                            <section className="create-product-section">
                                <div className="create-product-section-heading">
                                    <span className="create-product-step">
                                        02
                                    </span>

                                    <div>
                                        <h2>Product description</h2>
                                        <p>
                                            Help potential buyers understand
                                            the item.
                                        </p>
                                    </div>
                                </div>

                                <div className="create-product-field">
                                    <label htmlFor="product-description">
                                        Description <span>*</span>
                                    </label>

                                    <textarea
                                        id="product-description"
                                        placeholder="Describe the product, its condition, features, and anything a buyer should know..."
                                        value={description}
                                        onChange={(event) =>
                                            setDescription(event.target.value)
                                        }
                                        rows={6}
                                        maxLength={1500}
                                        required
                                        disabled={isSubmitting}
                                    />

                                    <small className="create-product-helper">
                                        {description.length}/1500 characters
                                    </small>
                                </div>

                                <div className="create-product-field">
                                    <label htmlFor="product-location">
                                        Pickup or meeting location{" "}
                                        <span>*</span>
                                    </label>

                                    <input
                                        id="product-location"
                                        type="text"
                                        placeholder="e.g. University of Ilorin"
                                        value={location}
                                        onChange={(event) =>
                                            setLocation(event.target.value)
                                        }
                                        maxLength={120}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </section>

                            {/* SECTION 3: PRODUCT IMAGE */}
                            <section className="create-product-section">
                                <div className="create-product-section-heading">
                                    <span className="create-product-step">
                                        03
                                    </span>

                                    <div>
                                        <h2>Product photograph</h2>
                                        <p>
                                            A clear photograph helps buyers
                                            evaluate your item.
                                        </p>
                                    </div>
                                </div>

                                <label
                                    htmlFor="product-image"
                                    className="create-product-upload"
                                >
                                    {image ? (
                                        <img
                                            src={image}
                                            alt="Selected product preview"
                                            className="create-product-upload-preview"
                                        />
                                    ) : (
                                        <span className="create-product-upload-icon">
                                            ↑
                                        </span>
                                    )}

                                    <strong>
                                        {imageFile?.name ||
                                            "Choose a product image"}
                                    </strong>

                                    <span>
                                        Click to select an image · Maximum
                                        size: 2 MB
                                    </span>

                                    <input
                                        id="product-image"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleImageChange}
                                        disabled={isSubmitting}
                                    />
                                </label>

                                {image && (
                                    <button
                                        type="button"
                                        className="create-product-remove-image"
                                        onClick={handleRemoveImage}
                                        disabled={isSubmitting}
                                    >
                                        Remove image
                                    </button>
                                )}
                            </section>

                            {/* VALIDATION MESSAGES */}
                            {error && (
                                <div
                                    className="create-product-message error"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div
                                    className="create-product-message success"
                                    role="status"
                                >
                                    {success}
                                </div>
                            )}

                            {/* FORM ACTIONS */}
                            <div className="create-product-actions">
                                <Link
                                    to="/marketplace"
                                    className="create-product-cancel"
                                >
                                    Cancel
                                </Link>

                                <button
                                    type="submit"
                                    className="button button-primary create-product-submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Publishing..."
                                        : "Publish listing"}

                                    <span aria-hidden="true">→</span>
                                </button>
                            </div>

                            <p className="create-product-disclaimer">
                                Make sure your product description and price
                                are accurate. Arrange exchanges responsibly
                                and confirm the item before completing a
                                transaction.
                            </p>
                        </form>

                        {/* SIDEBAR */}
                        <aside className="create-product-sidebar">
                            <div className="create-product-tip-card">
                                <span className="create-product-tip-icon">
                                    ✦
                                </span>

                                <h3>Tips for a good listing</h3>

                                <ul>
                                    <li>Use a clear product name.</li>
                                    <li>Set a fair and accurate price.</li>
                                    <li>
                                        Describe the item's actual condition.
                                    </li>
                                    <li>Choose a clear photograph.</li>
                                    <li>
                                        Provide a convenient meeting location.
                                    </li>
                                </ul>
                            </div>

                            <div className="create-product-preview-card">
                                <span className="section-kicker">
                                    LISTING PREVIEW
                                </span>

                                <div className="create-product-preview-image">
                                    {image ? (
                                        <img src={image} alt="" />
                                    ) : (
                                        <span aria-hidden="true">▧</span>
                                    )}
                                </div>

                                <span className="create-product-preview-category">
                                    {category}
                                </span>

                                <h3>
                                    {name.trim() || "Your product name"}
                                </h3>

                                <strong className="create-product-preview-price">
                                    {price && Number(price) > 0
                                        ? formatPrice(Number(price))
                                        : "₦0"}
                                </strong>

                                <span className="create-product-preview-condition">
                                    {condition}
                                </span>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </>
    );
}

export default CreateProduct;

