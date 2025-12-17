
import OrdersClient from '@/components/orders/orders-client';
import { AuthWrapper } from '@/components/auth/auth-wrapper';

export default function OrdersPage() {
  return (
    <AuthWrapper>
      <OrdersClient />
    </AuthWrapper>
  );
}
