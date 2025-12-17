# 🧮 Cartesian Product Variant Generation for E-commerce

## **Problem Statement**
When building a custom candle e-commerce system, we need to generate all possible product variants from multiple attribute combinations. This is a classic **Cartesian Product** problem in combinatorics.

## **The Math: Cartesian Product**

### **Definition**
The Cartesian Product of sets A, B, C is the set of all ordered triples (a, b, c) where:
- a ∈ A (wax types)
- b ∈ B (wick types) 
- c ∈ C (container-sizes)

**Formula:** |A| × |B| × |C| = Total Combinations

### **Our Candle Business Case**

**Input Sets:**
- **Wax Types (A):** Soy, Beeswax, Coconut Soy → |A| = 3
- **Wick Types (B):** Cotton, Hemp, Wood → |B| = 3  
- **Container-Sizes (C):** Mason Jar 16oz, Metal Tin 8oz → |C| = 2

**Calculation:**
```
3 wax × 3 wicks × 2 container-sizes = 18 total variants
```

### **All 18 Generated Variants**

```
1.  Soy + Cotton + Mason Jar 16oz
2.  Soy + Cotton + Metal Tin 8oz
3.  Soy + Hemp + Mason Jar 16oz
4.  Soy + Hemp + Metal Tin 8oz
5.  Soy + Wood + Mason Jar 16oz
6.  Soy + Wood + Metal Tin 8oz
7.  Beeswax + Cotton + Mason Jar 16oz
8.  Beeswax + Cotton + Metal Tin 8oz
9.  Beeswax + Hemp + Mason Jar 16oz
10. Beeswax + Hemp + Metal Tin 8oz
11. Beeswax + Wood + Mason Jar 16oz
12. Beeswax + Wood + Metal Tin 8oz
13. Coconut Soy + Cotton + Mason Jar 16oz
14. Coconut Soy + Cotton + Metal Tin 8oz
15. Coconut Soy + Hemp + Mason Jar 16oz
16. Coconut Soy + Hemp + Metal Tin 8oz
17. Coconut Soy + Wood + Mason Jar 16oz
18. Coconut Soy + Wood + Metal Tin 8oz
```

## **Implementation Strategy**

### **1. Variant Generation Algorithm**
```typescript
function generateAllVariants(
  waxTypes: string[],
  wickTypes: string[], 
  containerSizes: string[]
): ProductVariant[] {
  const variants: ProductVariant[] = [];
  
  for (const wax of waxTypes) {
    for (const wick of wickTypes) {
      for (const container of containerSizes) {
        variants.push({
          title: `${wax} Candle - ${wick} Wick - ${container}`,
          attributes: { wax, wick, container },
          price: calculatePrice(wax, wick, container),
          sku: generateSKU(wax, wick, container)
        });
      }
    }
  }
  
  return variants;
}
```

### **2. Price Calculation**
```typescript
function calculatePrice(wax: string, wick: string, container: string): number {
  const waxCost = getWaxCostPerOz(wax) * getContainerSizeOz(container);
  const wickCost = getWickCost(wick);
  const containerCost = getContainerCost(container);
  
  return waxCost + wickCost + containerCost;
}
```

### **3. Shopify Integration**
- Generate all 18 variants
- Push to Shopify via Admin API
- Update inventory based on ingredient availability
- Sync pricing with real-time costs

## **Business Impact**

### **Before (Manual Approach):**
- ❌ Manually create each variant
- ❌ 18 variants = 18 manual entries
- ❌ Error-prone, time-consuming
- ❌ Hard to maintain consistency

### **After (Cartesian Product Algorithm):**
- ✅ Generate all variants programmatically
- ✅ 18 variants = 1 algorithm execution
- ✅ Consistent naming and pricing
- ✅ Easy to add new attributes (scales to 3×4×3 = 36 variants)

## **Scalability**

**Adding New Attributes:**
- **New Wax Type:** 4×3×2 = 24 variants
- **New Wick Type:** 3×4×2 = 24 variants  
- **New Container:** 3×3×3 = 27 variants

**Complexity:** O(n×m×p) where n, m, p are attribute counts

## **Portfolio Value**

### **Technical Skills Demonstrated:**
- **Combinatorics:** Understanding Cartesian Products
- **Algorithm Design:** Efficient variant generation
- **E-commerce Integration:** Shopify API automation
- **Scalable Architecture:** Handles growing product catalogs
- **Business Logic:** Real-world pricing calculations

### **Business Value:**
- **Automation:** Reduces manual work from hours to seconds
- **Scalability:** Easy to add new product attributes
- **Consistency:** Ensures uniform naming and pricing
- **Maintainability:** Single source of truth for variant logic

## **Real-World Applications**

This pattern applies to any e-commerce system with:
- **Clothing:** Size × Color × Style
- **Electronics:** Model × Color × Storage
- **Food:** Flavor × Size × Packaging
- **Furniture:** Material × Color × Dimensions

**The beauty of mathematics is in its abstraction - the same Cartesian Product logic that generates candle variants can power any multi-attribute product system!** 🧮✨
