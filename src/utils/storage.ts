const PRODUCTS_KEY = "campus-tech-hub-products";
const SERVICES_KEY = "campus-tech-hub-services";

export interface ProductListing {
  id: string;
  name: string;
  price: number;
  category: string;
  condition: string;
  seller: string;
  location: string;
  description: string;
  image: string;
  createdAt: string;
}

export type PricingModel =
  | "Fixed Price"
  | "Hourly Rate"
  | "Price on Request";

export interface ServiceListing {
  id: string;
  title: string;
  category: string;
  description: string;
  pricingModel: PricingModel;
  price: number | null;
  location: string;
  contactMethod: string;
  contactValue: string;
  image: string;
  createdAt: string;
}

function readItems<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeItems<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function notifyListingChange(type: "products" | "services"): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("campus-listings-updated", {
        detail: { type },
      }),
    );
  }
}

// ==========================================
// PRODUCTS
// ==========================================

export function getProducts(): ProductListing[] {
  return readItems<ProductListing>(PRODUCTS_KEY);
}

export function saveProduct(product: ProductListing): void {
  const products = getProducts();

  const updatedProducts = [
    product,
    ...products.filter((item) => item.id !== product.id),
  ];

  writeItems(PRODUCTS_KEY, updatedProducts);
  notifyListingChange("products");
}

export function deleteProduct(productId: string): void {
  const products = getProducts();

  const updatedProducts = products.filter(
    (product) => product.id !== productId,
  );

  writeItems(PRODUCTS_KEY, updatedProducts);
  notifyListingChange("products");
}

// ==========================================
// SERVICES
// ==========================================

export function getServices(): ServiceListing[] {
  return readItems<ServiceListing>(SERVICES_KEY);
}

export function saveService(service: ServiceListing): void {
  const services = getServices();

  const updatedServices = [
    service,
    ...services.filter((item) => item.id !== service.id),
  ];

  writeItems(SERVICES_KEY, updatedServices);
  notifyListingChange("services");
}

export function deleteService(serviceId: string): void {
  const services = getServices();

  const updatedServices = services.filter(
    (service) => service.id !== serviceId,
  );

  writeItems(SERVICES_KEY, updatedServices);
  notifyListingChange("services");
}