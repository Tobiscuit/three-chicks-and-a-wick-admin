#!/usr/bin/env node

/**
 * Migration script to fix description formatting for existing products
 * 
 * This script:
 * 1. Fetches all products from Shopify
 * 2. Checks if descriptions have malformed HTML (from formatHtmlForEditing)
 * 3. Cleans up the HTML and updates the product
 * 
 * Run with: node scripts/fix-description-formatting.mjs
 */

import { getProducts } from '../src/services/shopify.js';
import { updateProductDescription } from '../src/services/shopify.js';

// Function to detect if HTML was formatted by formatHtmlForEditing
function isMalformedHtml(html) {
  if (!html || typeof html !== 'string') return false;
  
  // Check for signs of formatHtmlForEditing:
  // - Extra line breaks after closing tags
  // - Line breaks before opening tags
  // - Multiple consecutive newlines
  const hasExtraLineBreaks = /\n\s*<\/[^>]+>\s*\n/.test(html);
  const hasLineBreaksBeforeTags = /\n\s*<[^>]+>/.test(html);
  const hasMultipleNewlines = /\n\s*\n\s*\n/.test(html);
  
  return hasExtraLineBreaks || hasLineBreaksBeforeTags || hasMultipleNewlines;
}

// Function to clean up malformed HTML
function cleanHtml(html) {
  if (!html || typeof html !== 'string') return html;
  
  // Remove extra line breaks and whitespace
  let cleaned = html
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Multiple newlines to double
    .replace(/^\s*\n/g, '')            // Leading newlines
    .replace(/\n\s*$/g, '')            // Trailing newlines
    .replace(/>\s*\n\s*</g, '><')      // Line breaks between tags
    .replace(/\n\s*<\/[^>]+>\s*\n/g, '</$1>')  // Line breaks after closing tags
    .replace(/\n\s*<[^>]+>/g, '<$1>')  // Line breaks before opening tags
    .trim();
  
  return cleaned;
}

async function migrateDescriptions() {
  console.log('🔍 Starting description formatting migration...');
  
  try {
    // Get all products
    console.log('📦 Fetching all products...');
    const products = await getProducts(50); // Get first 50 products
    console.log(`Found ${products.length} products`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        console.log(`\n🔍 Checking product: ${product.title}`);
        
        if (!product.description) {
          console.log('  ⏭️  No description, skipping');
          continue;
        }
        
        if (isMalformedHtml(product.description)) {
          console.log('  🔧 Malformed HTML detected, fixing...');
          
          const cleanedDescription = cleanHtml(product.description);
          console.log('  📝 Original length:', product.description.length);
          console.log('  📝 Cleaned length:', cleanedDescription.length);
          
          // Update the product description
          await updateProductDescription(product.id, cleanedDescription);
          console.log('  ✅ Updated successfully');
          fixedCount++;
        } else {
          console.log('  ✅ HTML looks good, skipping');
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Error processing ${product.title}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`✅ Fixed: ${fixedCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateDescriptions();
