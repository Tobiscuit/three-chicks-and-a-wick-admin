import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.vercel') });
config({ path: resolve(__dirname, '../.env.local') });

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-07';
const SHOPIFY_API_URL = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

async function fetchShopify(query, variables = {}) {
  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const deleteMutation = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node docs-internal/delete-test-product.mjs <productId or gid>');
  process.exit(1);
}
const productGid = arg.startsWith('gid://') ? arg : `gid://shopify/Product/${arg}`;

const result = await fetchShopify(deleteMutation, {
  input: { id: productGid },
});

if (result.productDelete.userErrors?.length) {
  console.error('UserErrors:', result.productDelete.userErrors);
  process.exit(1);
}

console.log('Deleted:', result.productDelete.deletedProductId);

