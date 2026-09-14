import { CartProvider } from "@/context/cart-context"
import { AuthProvider } from "@/context/auth-context"
import { NavigationHistoryProvider } from "@/context/navigation-history"
import { ViewAsProvider } from "@/context/view-as-context"
import { ViewAsBanner } from "@/components/view-as-banner"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        // ViewAsProvider wraps AuthProvider because auth reads it: while an admin
        // is viewing as a member, the header has to reflect that member's
        // entitlements rather than the admin's.
        <ViewAsProvider>
            {/* Before children, not after: the bar is sticky rather than fixed, so
                it has to sit at the top of the document to pin to the top of the
                viewport. Rendered last it would stick to the bottom of the page. */}
            <ViewAsBanner />
            <AuthProvider>
                <CartProvider>
                    <NavigationHistoryProvider>{children}</NavigationHistoryProvider>
                </CartProvider>
            </AuthProvider>
            {/* Mounted here, not per layout: toast() is called from member-facing
                pages (checkout, the dashboard, the reader) that render no Toaster
                of their own, so those messages had nowhere to appear. */}
            <Toaster position="top-right" theme="dark" />
        </ViewAsProvider>
    )
}
