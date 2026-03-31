"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ShoppingBag,
    MapPin,
    Package,
    CheckCircle2,
    Truck,
    ChevronDown,
    ChevronUp,
    Loader2,
    Search,
    Filter,
    DollarSign,
    Calendar,
    User,
    BookOpen,
    Clock,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

// ── Types ──────────────────────────────────────────────────────────────────────

interface ShippingAddress {
    name?: string
    line1?: string
    line2?: string | null
    city?: string
    state?: string
    postal_code?: string
    country?: string
}

interface OrderItem {
    id: string
    variant_id: string
    quantity: number
    unit_price: number
    book_variants: {
        format: string
        books: {
            title: string
            author: string
        } | null
    } | null
}

export interface AdminOrder {
    id: string
    user_id: string
    status: "pending" | "confirmed" | "fulfilled"
    subtotal: number
    tax_amount: number
    shipping_amount: number
    total: number
    shipping_name?: string | null
    shipping_email?: string | null
    shipping_address?: string | null
    shipping_city?: string | null
    shipping_state?: string | null
    shipping_zip?: string | null
    placed_at: string
    users: {
        email: string
        full_name?: string | null
        display_name?: string | null
    } | null
    order_items: OrderItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function getStatusConfig(status: AdminOrder["status"]) {
    switch (status) {
        case "pending":
            return {
                label: "Pending",
                icon: Clock,
                className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
            }
        case "confirmed":
            return {
                label: "Confirmed",
                icon: Package,
                className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            }
        case "fulfilled":
            return {
                label: "Fulfilled",
                icon: CheckCircle2,
                className: "bg-green-500/10 text-green-400 border border-green-500/20",
            }
    }
}

function getFormatLabel(format: string) {
    switch (format) {
        case "paper_book": return "Paperback"
        case "ebook": return "eBook"
        case "komet_card": return "Komet Card"
        default: return format
    }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminOrder["status"] }) {
    let cfg: {
        label: string
        icon: any
        className: string
    } = {
        label: status,
        icon: ShoppingBag,
        className: "bg-muted text-muted-foreground border-border",
    }

    switch (status) {
        case "pending":
            cfg = {
                label: "Pending",
                icon: Clock,
                className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
            }
            break
        case "confirmed":
            cfg = {
                label: "Confirmed",
                icon: Package,
                className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            }
            break
        case "fulfilled":
            cfg = {
                label: "Fulfilled",
                icon: CheckCircle2,
                className: "bg-green-500/10 text-green-400 border border-green-500/20",
            }
            break
    }

    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.className}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    )
}

function OrderCard({
    order,
    onStatusUpdate,
}: {
    order: AdminOrder
    onStatusUpdate: (id: string, updates: Partial<AdminOrder>) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const fullName = order.users?.full_name
    const isNameValid = fullName && fullName !== "undefined undefined" && !fullName.toLowerCase().includes("undefined")
    const customerName =
        order.shipping_name ||
        (isNameValid ? fullName : order.users?.display_name) ||
        order.users?.email ||
        "Unknown Customer"

    const physicalItems = order.order_items.filter(
        (i) => i.book_variants?.format === "paper_book" || i.book_variants?.format === "komet_card"
    )
    const needsShipping = physicalItems.length > 0

    return (
        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/20 transition-all overflow-hidden">
            {/* ── Card Header ── */}
            <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                {/* Order ID + Status */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">
                                #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <StatusBadge status={order.status} />
                            {needsShipping && (
                                <span className="inline-flex items-center gap-1 text-xs text-secondary border border-secondary/20 bg-secondary/10 px-2 py-0.5 rounded-full">
                                    <Truck className="w-3 h-3" />
                                    Ships Physical
                                </span>
                            )}
                        </div>
                        <p className="font-medium text-sm truncate">{customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.users?.email || order.shipping_email}</p>
                    </div>
                </div>

                {/* Meta + Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-6 shrink-0">
                    <div className="text-right">
                        <p className="font-display text-xl tracking-wide text-primary">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.placed_at)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={order.status}
                            onValueChange={(v: "pending" | "confirmed" | "fulfilled") => onStatusUpdate(order.id, { status: v })}
                        >
                            <SelectTrigger className="h-9 w-40 bg-muted/40 border-border/50">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded((v) => !v)}
                            className="text-muted-foreground hover:text-primary"
                        >
                            {expanded ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Expanded Details ── */}
            {expanded && (
                <div className="border-t border-border/30 bg-background/30">
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Items */}
                        <div>
                            <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                <BookOpen className="w-3 h-3" /> Order Items ({order.order_items.length})
                            </h4>
                            <div className="space-y-2">
                                {order.order_items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-start justify-between gap-3 p-3 bg-muted/30 rounded-lg"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {item.book_variants?.books?.title ?? "Unknown Book"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                by {item.book_variants?.books?.author ?? "Unknown"} ·{" "}
                                                <span className="text-primary/80">
                                                    {getFormatLabel(item.book_variants?.format ?? "")}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-medium">{formatCurrency(item.unit_price)}</p>
                                            <p className="text-xs text-muted-foreground">qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Price breakdown */}
                            <div className="mt-4 space-y-1.5 pt-3 border-t border-border/30 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tax</span>
                                    <span>{formatCurrency(order.tax_amount)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Shipping</span>
                                    <span>{formatCurrency(order.shipping_amount)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-base pt-1 border-t border-border/30">
                                    <span>Total</span>
                                    <span className="text-primary">{formatCurrency(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Shipping address */}
                        <div>
                            <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Shipping Address
                            </h4>
                            {order.shipping_address ? (
                                <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-1">
                                    {order.shipping_name && <p className="font-medium">{order.shipping_name}</p>}
                                    {order.shipping_address && <p className="text-muted-foreground">{order.shipping_address}</p>}
                                    {(order.shipping_city || order.shipping_state || order.shipping_zip) && (
                                        <p className="text-muted-foreground">
                                            {[order.shipping_city, order.shipping_state, order.shipping_zip]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground italic">
                                    No shipping address on file (digital order)
                                </div>
                            )}

                            {/* Order metadata */}
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>Placed: {formatDate(order.placed_at)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span className="font-mono">{order.user_id.slice(0, 12)}…</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    )
}


// ── Main Component ─────────────────────────────────────────────────────────────

interface AdminOrdersContentProps {
    initialOrders: AdminOrder[]
}

export function AdminOrdersContent({ initialOrders }: AdminOrdersContentProps) {
    const supabase = useMemo(() => createClient(), [])

    const [orders, setOrders] = useState<AdminOrder[]>(initialOrders)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | AdminOrder["status"]>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const pending = orders.filter((o) => o.status === "pending").length
        const confirmed = orders.filter((o) => o.status === "confirmed").length
        const fulfilled = orders.filter((o) => o.status === "fulfilled").length
        const revenue = orders
            .filter((o) => o.status !== "pending")
            .reduce((sum, o) => sum + o.total, 0)
        return { pending, confirmed, fulfilled, revenue, total: orders.length }
    }, [orders])

    // ── Filtered list ──────────────────────────────────────────────────────────
    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            const matchesStatus = statusFilter === "all" || o.status === statusFilter
            const term = searchTerm.toLowerCase()
            const matchesSearch =
                !term ||
                o.id.toLowerCase().includes(term) ||
                o.users?.email?.toLowerCase().includes(term) ||
                o.users?.full_name?.toLowerCase().includes(term) ||
                o.users?.display_name?.toLowerCase().includes(term) ||
                o.order_items.some((i) =>
                    i.book_variants?.books?.title?.toLowerCase().includes(term)
                )
            return matchesStatus && matchesSearch
        })
    }, [orders, statusFilter, searchTerm])

    // ── Pagination Calculation ─────────────────────────────────────────────────
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredOrders.slice(start, start + itemsPerPage)
    }, [filteredOrders, currentPage, itemsPerPage])

    // Reset page when filtering or searching
    useMemo(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter, itemsPerPage])

    // ── Update Order Status handler ───────────────────────────────────────────
    const handleUpdateOrderStatus = async (id: string, updates: Partial<AdminOrder>) => {
        const loadingToast = toast.loading("Updating mission status...")
        const { error } = await supabase
            .from("orders")
            .update(updates)
            .eq("id", id)

        if (error) {
            toast.error("Failed to update order status", { id: loadingToast })
            console.error(error)
        } else {
            setOrders((prev) =>
                prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
            )
            toast.success("Order parameters synchronized", { id: loadingToast })
        }
    }

    return (
        <div className="p-4 md:p-8">
            {/* ── Header ── */}
            <div className="mb-8">
                <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
                    <span className="text-primary">ORDER</span>{" "}
                    <span className="text-secondary">CONTROL</span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground">
                    Track and manage all customer orders and shipments
                </p>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    {
                        label: "Total Orders",
                        value: stats.total,
                        icon: ShoppingBag,
                        color: "text-primary",
                        bg: "bg-primary/10",
                    },
                    {
                        label: "Awaiting Action",
                        value: stats.pending + stats.confirmed,
                        icon: Clock,
                        color: "text-yellow-400",
                        bg: "bg-yellow-500/10",
                    },
                    {
                        label: "Fulfilled",
                        value: stats.fulfilled,
                        icon: CheckCircle2,
                        color: "text-green-400",
                        bg: "bg-green-500/10",
                    },
                    {
                        label: "Revenue",
                        value: formatCurrency(stats.revenue),
                        icon: DollarSign,
                        color: "text-secondary",
                        bg: "bg-secondary/10",
                        isText: true,
                    },
                ].map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card
                            key={stat.label}
                            className="p-5 bg-card/50 backdrop-blur border-border/50"
                        >
                            <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                                <Icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                            <p className={`font-display text-2xl ${stat.color} leading-none mb-1`}>
                                {stat.value}
                            </p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </Card>
                    )
                })}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by order ID, customer, or book title…"
                        className="pl-9 bg-card/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v: any) => setStatusFilter(v)}
                >
                    <SelectTrigger className="w-full sm:w-48 bg-card/50">
                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Orders</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => setItemsPerPage(parseInt(v))}
                >
                    <SelectTrigger className="w-full sm:w-32 bg-card/50">
                        <span className="text-xs mr-2 text-muted-foreground">Show:</span>
                        <SelectValue placeholder="Display Limit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* ── Orders List ── */}
            {paginatedOrders.length === 0 ? (
                <Card className="p-16 border-dashed border-2 border-border/50 text-center flex flex-col items-center">
                    <ShoppingBag className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="font-display text-3xl tracking-wide uppercase mb-2">
                        {searchTerm || statusFilter !== "all"
                            ? "No Matching Transmissions"
                            : "Clear Launch Pad"}
                    </h3>
                    <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all"
                            ? "Try adjusting your search or filter."
                            : "No orders have made it through yet."}
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">
                            Page {currentPage} of {totalPages} ({filteredOrders.length} total)
                        </p>
                    </div>
                    {paginatedOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onStatusUpdate={handleUpdateOrderStatus}
                        />
                    ))}

                    {/* ── Pagination Controls ── */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 bg-card/30 p-4 rounded-xl border border-border/50">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-medium text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-primary">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-medium">{filteredOrders.length}</span> missions
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="bg-transparent border-border/50 hover:bg-muted/50"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                </Button>

                                <div className="flex items-center gap-1 mx-2">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1
                                        // Basic logic to show limited page buttons if many exist
                                        if (totalPages > 7) {
                                            if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                                                if (Math.abs(pageNum - currentPage) === 2) return <span key={pageNum} className="px-1 text-muted-foreground opacity-50">...</span>
                                                return null
                                            }
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 p-0 rounded-lg ${currentPage === pageNum ? "bg-primary shadow-lg shadow-primary/20" : "text-muted-foreground"}`}
                                            >
                                                {pageNum}
                                            </Button>
                                        )
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="bg-transparent border-border/50 hover:bg-muted/50"
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}
