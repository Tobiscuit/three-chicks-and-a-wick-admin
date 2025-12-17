"use server";

import { listAllSalesChannels } from "@/services/shopify";

// ADD THIS NEW ACTION
export async function runListChannelsCheck() {
    await listAllSalesChannels();
}
