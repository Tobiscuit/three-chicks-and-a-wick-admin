export type ResolveVariantRequest = {
  vesselHandle: string;
  wax: string;
  wick: string;
};

export type ResolveVariantResponse = {
  variantId: string;
  price: string; // formatted "0.00"
  deploymentVersion?: string;
};

export type AddToCartRequest = ResolveVariantRequest & {
  cartId?: string;
  qty: number;
};

export type AddToCartResponse = {
  cartId: string;
  lineId: string;
  variantId: string;
  price: string; // formatted "0.00"
};

function assertOk(res: Response) {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}

export async function resolveVariant(body: ResolveVariantRequest): Promise<ResolveVariantResponse> {
  const res = await fetch('/api/magic/resolve-variant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assertOk(res);
  return res.json();
}

export async function addToCart(body: AddToCartRequest, idempotencyKey: string): Promise<AddToCartResponse> {
  const res = await fetch('/api/magic/add-to-cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  assertOk(res);
  return res.json();
}



