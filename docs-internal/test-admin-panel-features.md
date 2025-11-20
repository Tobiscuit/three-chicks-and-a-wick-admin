# 🧪 Admin Panel Feature Testing Checklist

## Pre-Testing Setup

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Log In
1. Navigate to http://localhost:3000
2. Sign in with your Firebase account
3. Verify you see the sidebar with "Magic Request" link

---

## ✅ Fragrance Management Tests

### Navigate to Feature
1. Click "Magic Request" in sidebar
2. Click "Fragrances" tab
3. You should see the Fragrance Inventory page

### Test 1: View Empty State
**Expected:** If no fragrances exist, you should see:
- "No fragrances yet" message
- "Add First Fragrance" button
- Sparkles icon

**Result:** ☐ Pass ☐ Fail

### Test 2: Create Fragrance
1. Click "Add Fragrance" button
2. Fill in form:
   ```
   Name: French Lavender
   Description: A floral, calming scent from lavender fields
   Quantity (oz): 64.5
   Cost per oz: 3.50
   Status: In Stock
   ```
3. Click "Create"

**Expected:**
- ✅ Success toast appears
- ✅ Dialog closes
- ✅ Fragrance appears in table
- ✅ Stats update (Total: 1, In Stock: 1)

**Result:** ☐ Pass ☐ Fail

### Test 3: Create Multiple Fragrances
Create these fragrances:

**Fragrance 2:**
```
Name: Vanilla Bean
Description: Rich, sweet vanilla extract
Quantity: 32.0
Cost per oz: 4.25
Status: Low Stock
```

**Fragrance 3:**
```
Name: Ocean Breeze
Description: Fresh, salty sea air
Quantity: 0
Cost per oz: 3.00
Status: Out of Stock
```

**Expected:**
- ✅ All three fragrances in table
- ✅ Stats show: Total: 3, In Stock: 1, Low Stock: 1

**Result:** ☐ Pass ☐ Fail

### Test 4: Edit Fragrance
1. Click pencil icon on "French Lavender"
2. Change quantity to `48.0`
3. Click "Update"

**Expected:**
- ✅ Toast shows "Fragrance Updated"
- ✅ Table reflects new quantity

**Result:** ☐ Pass ☐ Fail

### Test 5: Status Badge Colors
**Expected:**
- IN_STOCK → Green badge
- LOW → Yellow badge
- OUT_OF_STOCK → Red badge

**Result:** ☐ Pass ☐ Fail

### Test 6: Delete Fragrance
1. Click trash icon on "Ocean Breeze"
2. Confirm deletion

**Expected:**
- ✅ Confirmation dialog appears
- ✅ After confirming, fragrance removed
- ✅ Stats update to Total: 2

**Result:** ☐ Pass ☐ Fail

### Test 7: Form Validation
1. Click "Add Fragrance"
2. Try to create without entering a name
3. Click "Create"

**Expected:**
- ✅ Error toast: "Fragrance name is required"
- ✅ Dialog stays open

**Result:** ☐ Pass ☐ Fail

### Test 8: Negative Quantity Validation
1. Try to enter `-10` in quantity field
2. Click "Create"

**Expected:**
- ✅ Error toast: "Quantity must be a positive number"

**Result:** ☐ Pass ☐ Fail

---

## ✅ Manual Review Queue Tests

### Navigate to Feature
1. Stay on Magic Request page
2. Click "Reviews" tab
3. You should see the Manual Review Queue page

### Test 9: Empty State
**Expected:** If no shared candles:
- "All caught up!" message
- Green checkmark icon
- Description text

**Result:** ☐ Pass ☐ Fail

### Test 10: View Shared Candles
**Note:** This requires the Storefront to have shared candles in DynamoDB.

If shared candles exist:

**Expected:**
- ✅ Cards showing candle names
- ✅ Job IDs displayed
- ✅ Created timestamps
- ✅ "Pending" badge
- ✅ Preview/Approve/Reject buttons

**Result:** ☐ Pass ☐ Fail ☐ N/A (No data)

### Test 11: Preview Candle
1. Click "Preview" on a shared candle

**Expected:**
- ✅ Modal opens
- ✅ Shows candle name in title
- ✅ Shows Job ID and timestamp
- ✅ Renders HTML content
- ✅ Shows Approve/Reject buttons

**Result:** ☐ Pass ☐ Fail ☐ N/A

### Test 12: Approve/Reject Actions
1. Click "Approve" button

**Expected:**
- ✅ Toast: "Coming Soon" (backend not yet connected)

**Result:** ☐ Pass ☐ Fail ☐ N/A

### Test 13: Refresh Button
1. Click "Refresh" button

**Expected:**
- ✅ Re-fetches data
- ✅ List updates

**Result:** ☐ Pass ☐ Fail ☐ N/A

---

## ✅ Navigation & UI Tests

### Test 14: Tab Switching
1. Click between all tabs: Overview, Pricing, Variants, Fragrances, Reviews, Logs

**Expected:**
- ✅ All tabs render without errors
- ✅ Active tab highlighted
- ✅ Content changes

**Result:** ☐ Pass ☐ Fail

### Test 15: Mobile Responsive (Optional)
1. Open DevTools
2. Toggle device toolbar (mobile view)
3. Check Fragrances tab

**Expected:**
- ✅ Table scrolls horizontally on mobile
- ✅ Buttons stack properly
- ✅ Modal responsive

**Result:** ☐ Pass ☐ Fail ☐ Skipped

### Test 16: Dark Mode
**Expected:**
- ✅ All components follow dark theme
- ✅ No white backgrounds bleeding through
- ✅ Text readable

**Result:** ☐ Pass ☐ Fail

---

## ✅ API Integration Tests

### Test 17: Authentication Check
1. Open browser DevTools → Network tab
2. Create a fragrance
3. Look at the request to `/api/storefront/fragrances`

**Expected:**
- ✅ Request includes `Authorization: Bearer <token>` header
- ✅ Response is 200 OK
- ✅ Response includes `{ success: true, data: {...} }`

**Result:** ☐ Pass ☐ Fail

### Test 18: Error Handling
1. Open browser DevTools → Console
2. Look for any errors while using features

**Expected:**
- ✅ No console errors
- ✅ Network errors handled gracefully
- ✅ Toast notifications for errors

**Result:** ☐ Pass ☐ Fail

### Test 19: Loading States
1. Create a fragrance
2. Observe button state

**Expected:**
- ✅ Button shows "Creating..." with spinner
- ✅ Button disabled during submission
- ✅ Returns to normal after completion

**Result:** ☐ Pass ☐ Fail

---

## 🔗 End-to-End Integration Tests

### Test 20: Storefront Integration (Requires Coordination)
1. Create fragrance in Admin Panel: `Rose Petals`
2. Go to Storefront Magic Request page
3. Submit a candle request
4. Check if AI mentions using `Rose Petals`

**Expected:**
- ✅ AI sees the fragrance in prompt
- ✅ AI uses it when appropriate

**Result:** ☐ Pass ☐ Fail ☐ N/A

### Test 21: Shared Candle Flow (Requires Coordination)
1. In Storefront, create a candle and click "Share"
2. In Admin Panel, go to Reviews tab
3. Check if candle appears

**Expected:**
- ✅ Shared candle appears in queue
- ✅ Can preview it
- ✅ Job ID matches

**Result:** ☐ Pass ☐ Fail ☐ N/A

---

## 📊 Test Results Summary

**Fragrance Management:** ___/9 tests passed  
**Manual Review Queue:** ___/5 tests passed  
**Navigation & UI:** ___/3 tests passed  
**API Integration:** ___/3 tests passed  
**End-to-End:** ___/2 tests passed  

**Overall:** ___/22 tests passed

---

## 🐛 Issues Found

| Test # | Issue Description | Severity | Notes |
|--------|------------------|----------|-------|
|        |                  |          |       |
|        |                  |          |       |
|        |                  |          |       |

---

## ✅ Sign Off

**Tested By:** ________________  
**Date:** ________________  
**Environment:** ☐ Local Dev ☐ Staging ☐ Production  
**Browser:** ☐ Chrome ☐ Firefox ☐ Safari ☐ Edge  

**Ready for Deployment:** ☐ Yes ☐ No (see issues)

---

## 💡 Quick Debugging Tips

**If fragrances don't load:**
- Check browser console for errors
- Verify `.env.local` has correct AppSync URL
- Check Firebase authentication is working
- Verify API route at `/api/storefront/fragrances` exists

**If create/edit doesn't work:**
- Check Network tab for 401/403 errors
- Verify Firebase ID token is valid
- Check server logs for errors
- Verify DynamoDB table exists in Storefront

**If reviews tab is empty:**
- This is normal if no candles have been shared
- Coordinate with Storefront team to create test data
- Check GraphQL query is correct

---

**Testing Complete!** 🧪✅

