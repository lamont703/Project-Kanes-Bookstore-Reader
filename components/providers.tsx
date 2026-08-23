import { CartProvider } from "@/context/cart-context"
import { AuthProvider } from "@/context/auth-context"
import { NavigationHistoryProvider } from "@/context/navigation-history"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <CartProvider>
                <NavigationHistoryProvider>{children}</NavigationHistoryProvider>
            </CartProvider>
        </AuthProvider>
    )
}
