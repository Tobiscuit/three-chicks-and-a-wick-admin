'use server';

import { fetchShopify } from '@/services/shopify';

/**
 * Fetch Shopify locations
 * 
 * WHAT IS A LOCATION?
 * In Shopify, a "location" is a physical or virtual place where you store inventory.
 * - If you sell from home: you have 1 location (your home address)
 * - If you have a warehouse + retail store: you have 2 locations
 * - If you use a 3PL/fulfillment center: that's another location
 * 
 * WHY DOES IT MATTER?
 * Shopify tracks inventory PER LOCATION. To query "how many of X do I have?",
 * you need to specify WHICH location you're asking about.
 * 
 * For most small businesses like Three Chicks, there's just 1 location.
 */
export async function getLocations() {
  const query = `
    query GetLocations {
      locations(first: 10) {
        edges {
          node {
            id
            name
            address {
              address1
              city
              province
              country
            }
            isActive
            fulfillsOnlineOrders
          }
        }
      }
    }
  `;

  const response = await fetchShopify<{
    locations: {
      edges: Array<{
        node: {
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
      }>;
    };
  }>(query);

  return response.locations.edges.map(edge => edge.node);
}
