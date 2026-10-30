export const SERVICE_CATEGORIES = [
    "Phone Repair",
    "Computer Repair",
    "Software & Web Development",
    "Graphics Design",
    "Networking",
    "Electronics",
    "Other",
  ] as const;
  
  export type ServiceCategory =
    (typeof SERVICE_CATEGORIES)[number];
  
  export const SERVICE_PRICING_MODELS = [
    "Fixed Price",
    "Hourly Rate",
    "Price on Request",
  ] as const;
  
  export type ServicePricingModel =
    (typeof SERVICE_PRICING_MODELS)[number];
  
  export const SERVICE_CONTACT_METHODS = [
    "Phone",
    "Email",
    "WhatsApp",
  ] as const;
  
  export type ServiceContactMethod =
    (typeof SERVICE_CONTACT_METHODS)[number];