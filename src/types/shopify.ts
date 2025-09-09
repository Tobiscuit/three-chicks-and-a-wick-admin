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
