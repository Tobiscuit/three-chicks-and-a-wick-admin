# Container-Size Architecture Update for Storefront

## 🎯 **Core Problem & Solution**

**Problem:** Separate container and size selection creates too many combinations for MVP
**Solution:** Couple container and size together for simplified management

## 🏗️ **New Product Structure**

### **Before (Complex):**
```
Container: [Standard Tin, Amber Glass, Frosted Glass, Ceramic]
Size: [8oz, 12oz, 16oz]
Result: 12 combinations per wax/wick
```

### **After (Simplified - MVP with Real Products):**
```
Container-Size: [
  "Mason Jar 16oz",     // From client's actual sourcing
  "Metal Tin 8oz"       // From client's actual sourcing
]
Result: 2 combinations per wax/wick (MVP-friendly)
```

## 🔧 **Technical Implementation**

### **1. Updated Container-Size Mapping:**
```typescript
// Real products from client's sourcing
const containerSizeOptions = [
  { 
    id: 'mason-jar-16oz', 
    name: 'Mason Jar 16oz', 
    container: 'Mason Jar', 
    size: '16oz',
    costPerUnit: 0.96, // $11.56 / 12 = $0.96 per jar
    supplier: 'Bulk Supplier'
  },
  { 
    id: 'metal-tin-8oz', 
    name: 'Metal Tin 8oz', 
    container: 'Metal Tin', 
    size: '8oz',
    costPerUnit: 1.80, // Average of $1.70-$1.89
    supplier: 'Bulk Supplier'
  }
];
```

### **2. Ingredient-Based Inventory Management:**
```typescript
interface IngredientInventory {
  waxTypes: {
    [key: string]: {
      quantity: number;
      unit: 'pounds';
      costPerUnit: number;
    }
  };
  containerSizes: {
    [key: string]: {
      quantity: number;
      unit: 'pieces';
      costPerUnit: number;
    }
  };
  wicks: {
    [key: string]: {
      quantity: number;
      unit: 'pieces';
      costPerUnit: number;
    }
  };
}
```

### **3. Availability Calculation:**
```typescript
function calculateAvailableVariants(ingredients: IngredientInventory) {
  const availableVariants = [];
  
  for (const wax of Object.keys(ingredients.waxTypes)) {
    for (const wick of Object.keys(ingredients.wicks)) {
      for (const containerSize of Object.keys(ingredients.containerSizes)) {
        const canMake = checkIngredientAvailability(wax, wick, containerSize, ingredients);
        if (canMake) {
          availableVariants.push({
            wax,
            wick,
            containerSize,
            inventory_quantity: 999, // Available in Shopify
            estimatedQuantity: calculateMaxQuantity(wax, wick, containerSize, ingredients)
          });
        }
      }
    }
  }
  
  return availableVariants;
}
```

## 🎯 **Storefront UI Changes Needed**

### **1. Remove Separate Size Selection:**
```typescript
// OLD: Separate containers and sizes
<ContainerSelector />
<SizeSelector />

// NEW: Combined container-size selection
<ContainerSizeSelector options={containerSizeOptions} />
```

### **2. Update Product Configuration:**
```typescript
// OLD: Independent selection
interface ProductConfig {
  container: string;
  size: string;
  wax: string;
  wick: string;
}

// NEW: Coupled selection
interface ProductConfig {
  containerSize: string; // e.g., "mason-jar-16oz"
  wax: string;
  wick: string;
}
```

### **3. Update Price Calculation:**
```typescript
// OLD: Separate container and size pricing
function calculatePrice(container: string, size: string, wax: string, wick: string) {
  const containerPrice = getContainerPrice(container);
  const sizeMultiplier = getSizeMultiplier(size);
  const waxPrice = getWaxPrice(wax);
  const wickPrice = getWickPrice(wick);
  
  return (containerPrice + waxPrice + wickPrice) * sizeMultiplier;
}

// NEW: Combined container-size pricing
function calculatePrice(containerSize: string, wax: string, wick: string) {
  const containerSizePrice = getContainerSizePrice(containerSize);
  const waxPrice = getWaxPrice(wax);
  const wickPrice = getWickPrice(wick);
  
  return containerSizePrice + waxPrice + wickPrice;
}
```

## 🔧 **Admin Panel Implementation**

### **1. Ingredient Management UI:**
```typescript
// Admin can manage ingredients
interface IngredientForm {
  type: 'wax' | 'containerSize' | 'wick';
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
}

// Container-size specific form
interface ContainerSizeForm {
  container: string;
  size: string;
  quantity: number;
  costPerUnit: number;
}
```

### **2. Availability Dashboard:**
```typescript
// Show what can be made
interface AvailabilityDashboard {
  availableVariants: Variant[];
  lowStockIngredients: Ingredient[];
  canMakeCount: number;
  totalVariants: number;
}
```

## 🚀 **Migration Strategy**

### **Phase 1: Update Storefront UI**
1. **Remove separate size selector**
2. **Add combined container-size selector**
3. **Update price calculation logic**
4. **Test with limited options (Mason Jar 16oz, Metal Tin 8oz)**

### **Phase 2: Implement Ingredient Management**
1. **Add ingredient tracking to Admin Panel**
2. **Create availability calculation logic**
3. **Sync with Shopify variants**
4. **Test end-to-end workflow**

### **Phase 3: Advanced Features**
1. **Low stock alerts**
2. **Cost calculation**
3. **Supplier management**
4. **Reorder suggestions**

## 📋 **Code Changes Needed**

### **Storefront Changes:**
```typescript
// 1. Update container-size options
const containerSizeOptions = [
  { id: 'mason-jar-16oz', name: 'Mason Jar 16oz', container: 'Mason Jar', size: '16oz' },
  { id: 'metal-tin-8oz', name: 'Metal Tin 8oz', container: 'Metal Tin', size: '8oz' }
];

// 2. Update product configuration
interface ProductConfig {
  containerSize: string;
  wax: string;
  wick: string;
}

// 3. Update price calculation
function calculatePrice(containerSize: string, wax: string, wick: string) {
  const containerSizePrice = getContainerSizePrice(containerSize);
  const waxPrice = getWaxPrice(wax);
  const wickPrice = getWickPrice(wick);
  
  return containerSizePrice + waxPrice + wickPrice;
}
```

### **Admin Panel Changes:**
```typescript
// 1. Add ingredient management
interface IngredientInventory {
  waxTypes: { [key: string]: { quantity: number; unit: string; costPerUnit: number } };
  containerSizes: { [key: string]: { quantity: number; unit: string; costPerUnit: number } };
  wicks: { [key: string]: { quantity: number; unit: string; costPerUnit: number } };
}

// 2. Add availability calculation
function calculateAvailableVariants(ingredients: IngredientInventory) {
  // Implementation here
}

// 3. Add Shopify sync
async function syncVariantsToShopify(availableVariants: Variant[]) {
  // Implementation here
}
```

## 🎯 **Benefits of This Approach**

### **✅ MVP-Friendly:**
- **Simplified options** for initial launch
- **Easier inventory management**
- **Reduced complexity**
- **Real products from client's sourcing**

### **✅ Scalable:**
- **Easy to add new container-sizes**
- **Flexible ingredient tracking**
- **Automatic availability calculation**

### **✅ Operational Excellence:**
- **Real ingredient tracking**
- **Automatic variant management**
- **Cost calculation**
- **Low stock alerts**

## 📝 **Next Steps for Storefront Team**

1. **Update UI** to use combined container-size selection
2. **Remove separate size selector**
3. **Update price calculation logic**
4. **Test with limited options (Mason Jar 16oz, Metal Tin 8oz)**
5. **Implement ingredient management**
6. **Add availability calculation**
7. **Sync with Shopify variants**

## 🔧 **Real Product Data from Client's Sourcing**

### **Mason Jar 16oz:**
- **Cost:** $11.56 for 12-pack = $0.96 per jar
- **Supplier:** Bulk Supplier
- **Unit:** Pieces

### **Metal Tin 8oz:**
- **Cost:** $1.70-$1.89 each = $1.80 average
- **Supplier:** Bulk Supplier
- **Unit:** Pieces

## 🎯 **Final Recommendation**

**Use Shopify as the single source of truth.** Create all variants once, then use the Admin Panel to control which ones are available by managing inventory levels. This eliminates configuration drift and ensures customers can only buy what actually exists.

**This approach will make the MVP much more manageable while setting up a scalable foundation for growth!** 🚀
