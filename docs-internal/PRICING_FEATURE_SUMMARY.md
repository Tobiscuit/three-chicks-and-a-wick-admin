# Magic Request Pricing Management - Implementation Summary

## Problem
Admins need to update wax, wick, and container prices which should automatically update all affected variants across all products using Cartesian product pricing model - **without code changes**.

## Solution
Full UI-driven pricing management with preview and confirmation.

## Architecture

### Source of Truth
- **Shopify Metafields** (mr.* and magic_request.* namespaces)
- Pricing formula components stored in metafields:
  - Product: `mr.sizeOz`, `mr.vesselBaseCostCents`, `mr.marginPct`
  - Variant: `mr.waxPricePerOzCents`, `mr.wickCostCents`

### Pricing Formula
```
Price = (vesselBaseCostCents + wickCostCents + waxPricePerOzCents × sizeOz) × (1 + marginPct / 100)
```

### Data Flow
1. Fetch current pricing from Shopify metafields
2. Admin edits prices in UI
3. Calculate new prices for all affected variants
4. Preview changes (table showing current vs new)
5. Confirm by typing new price
6. Bulk update via `productVariantsBulkUpdate` mutation
7. Update metafields for wax/wick/vessel costs

## Implementation

### Files Created
- `src/services/magic-request-pricing.ts` - Core pricing service
- `src/app/magic-request/pricing-actions.ts` - Server actions
- `src/components/magic-request/pricing-manager.tsx` - UI component

### Key Functions

#### `getCurrentPricingConfig()`
- Queries all Magic Request products
- Extracts unique wax/wick/vessel prices from metafields
- Returns aggregated pricing config

#### `previewPriceChanges(updates)`
- Takes price updates (wax/wick/vessel)
- Calculates new prices for all variants
- Returns preview with current/new prices and diffs

#### `applyPriceChanges(updates, confirmationPrice)`
- Validates confirmation price
- Bulk updates variant prices (one mutation per product)
- Updates metafields in batches of 25
- Returns success/error status

## User Workflow

1. **Navigate** to Magic Request > Pricing tab
2. **Edit** wax/wick/vessel price (e.g., Soy from $0.18/oz to $0.20/oz)
3. **Preview** changes - see table of all affected variants
4. **Apply** changes - click button
5. **Confirm** - type one of the new prices shown
6. **Deploy** - system bulk updates all variant prices

## Key Features

### Intelligent Updates
- Changing wax price → Updates all variants with that wax across all containers
- Example: Change 'Soy' → Updates 6 variants (2 containers × 3 wicks)

### Preview Before Apply
- Shows table with: Product, Variant, Wax, Wick, Current Price, New Price, Change
- Summary shows total variants affected, total increase/decrease

### Confirmation Safety
- Must type one of the new prices to confirm
- Prevents accidental bulk updates
- Validates confirmation matches preview

### Bulk Operations
- Uses `productVariantsBulkUpdate` mutation
- One API call per product (not per variant)
- Batches metafield updates in chunks of 25

## GraphQL Queries

### Get Current Pricing
```graphql
query GetMagicRequestPricing {
  products(first: 50, query: "product_type:Magic Request") {
    edges {
      node {
        id
        title
        mrSizeOz: metafield(namespace: "mr", key: "sizeOz") { value }
        mrVesselBaseCostCents: metafield(namespace: "mr", key: "vesselBaseCostCents") { value }
        mrMarginPct: metafield(namespace: "mr", key: "marginPct") { value }
        variants(first: 100) {
          edges {
            node {
              id
              title
              price
              mrWaxPricePerOzCents: metafield(namespace: "mr", key: "waxPricePerOzCents") { value }
              mrWickCostCents: metafield(namespace: "mr", key: "wickCostCents") { value }
              selectedOptions { name value }
            }
          }
        }
      }
    }
  }
}
```

### Bulk Update Prices
```graphql
mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id }
    userErrors { field message }
  }
}
```

### Update Metafields
```graphql
mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id }
    userErrors { field message }
  }
}
```

## Metafields Structure

### Product Level (mr.*)
- `mr.sizeOz` - Container size in ounces
- `mr.vesselBaseCostCents` - Base cost of container in cents
- `mr.marginPct` - Margin percentage (e.g., 20 for 20%)

### Variant Level (mr.*)
- `mr.waxPricePerOzCents` - Price per ounce for wax type
- `mr.wickCostCents` - Cost for wick type
- `mr.enabled` - 1 = enabled, 0 = disabled

### Product Level (magic_request.*)
- `magic_request.waxTypes` - List of available wax types
- `magic_request.wickTypes` - List of available wick types
- `magic_request.containerType` - Container type name

**Note:** Using `magic_request` namespace (13 chars) instead of `mr` (2 chars) because Shopify requires 3+ character namespaces for metafield definitions.

## Example Scenarios

### Scenario 1: Change Wax Price
- **Action:** Change Soy wax from $0.18/oz to $0.20/oz
- **Result:** 6 variants update (2 containers × 3 wicks)
- **Calculation:** All variants with Soy wax get +$0.02 × sizeOz increase

### Scenario 2: Change Vessel Base Cost
- **Action:** Change Mason Jar base cost from $7.99 to $8.99
- **Result:** 6 variants update (1 container × 2 waxes × 3 wicks)
- **Calculation:** All variants in Mason Jar get +$1.00 × margin increase

### Scenario 3: Change Wick Cost
- **Action:** Change Hemp wick from $0.55 to $0.65
- **Result:** 4 variants update (2 containers × 2 waxes × 1 wick)
- **Calculation:** All variants with Hemp wick get +$0.10 × margin increase

## Questions for Shopify AI

1. Is using metafields for pricing config the best approach?
2. Is `productVariantsBulkUpdate` the most efficient way to update prices?
3. Should we use Shopify's Price List API instead?
4. Are there rate limits for bulk updates we should be aware of?
5. Is storing pricing formula components in metafields the right pattern?
6. Should we use Admin API or Storefront API? (Currently using Admin API)
7. Are there best practices for price change confirmations?
8. Should metafields and prices update in a transaction?





