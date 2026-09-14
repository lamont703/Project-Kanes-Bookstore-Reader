/**
 * User roles and what each may reach in the admin panel.
 *
 * `employee` sits between `reader` and `admin`: catalogue maintenance only.
 * Employees add, edit and publish books and merchandise; they delete nothing,
 * and they never see orders, customers, discussions, events, the book club or
 * site pages.
 *
 * The database is the real gate — see migration 20260826000001, where DELETE is
 * granted by no policy and every commerce and community table stays admin-only.
 * What lives here is the routing and UI half of the same rule, so an employee is
 * never shown a screen that would only fail on them.
 */
export type UserRole = "reader" | "employee" | "admin"

/**
 * The admin sections an employee may open, as path prefixes. Each also covers
 * its own sub-routes (/new, /[id]/edit).
 */
export const EMPLOYEE_ADMIN_PREFIXES = ["/admin/books", "/admin/products"] as const

/** Where an employee lands when they aim at anything else under /admin. */
export const EMPLOYEE_HOME = "/admin/books"

/** Admins and employees — anyone who belongs in the admin panel at all. */
export function isStaffRole(role: string | null | undefined): boolean {
    return role === "admin" || role === "employee"
}

export function isAdminRole(role: string | null | undefined): boolean {
    return role === "admin"
}

/** True when an employee is allowed to open this admin path. */
export function employeeCanAccess(pathname: string): boolean {
    return EMPLOYEE_ADMIN_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
}

/**
 * Where a role should be sent when it asks for an admin path, or null to allow.
 *
 * One function so the middleware and the admin layout cannot drift into
 * disagreeing about who gets in.
 */
export function adminRedirectFor(
    role: string | null | undefined,
    pathname: string
): string | null {
    if (isAdminRole(role)) return null
    if (role === "employee") return employeeCanAccess(pathname) ? null : EMPLOYEE_HOME
    return "/"
}
