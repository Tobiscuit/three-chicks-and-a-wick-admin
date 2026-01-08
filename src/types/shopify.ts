export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  totalInventory: number | null;
  description: string;
  productType: string;
  tags: string[];
  featuredImage: {
    url:string;
  } | null;
  images: {
    edges: {
      node: {
        url: string;
        altText: string | null;
      }
    }[]
  };
  variants: {
     edges: {
        node: {
            id: string;
            sku: string | null;
            inventoryItem: {
                id: string;
            };
        }
     }[]
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  onlineStoreUrl: string | null;
  collections: {
    edges: {
        node: {
            id: string;
            title: string;
        }
    }[]
  };
};

export type ShopifyOrder = {
  id: string;
  name: string;
  createdAt: string;
  processedAt: string;
  tags: string[];
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalShippingPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalTaxSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  shippingAddress?: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        quantity: number;
        product?: {
          id: string;
          title: string;
          featuredImage?: {
            url: string;
            altText: string | null;
          };
        };
        variant?: {
          title: string;
          sku: string;
        };
        customAttributes?: Array<{
          key: string;
          value: string;
        }>;
      };
    }>;
  };
};

export type ShopifyCollection = {
  id: string;
  title: string;
  handle: string;
};

export type ShopifyLocation = {
  id: string;
  name: string;
  address: {
    address1: string;
    city: string;
    province: string;
    country: string;
  };
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
};
