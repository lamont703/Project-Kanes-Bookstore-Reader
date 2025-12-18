export interface UserAnalytics {
  totalUsers: number
  activeSubscribers: number
  newUsersThisMonth: number
  churnRate: number
  revenueThisMonth: number
  totalRevenue: number
}

export interface AdminUser {
  id: string
  name: string
  email: string
  joinDate: Date
  subscription: "free" | "premium"
  booksOwned: number
  lastActive: Date
}

export const mockUserAnalytics: UserAnalytics = {
  totalUsers: 24567,
  activeSubscribers: 12843,
  newUsersThisMonth: 1256,
  churnRate: 3.2,
  revenueThisMonth: 154116,
  totalRevenue: 1847392,
}

export const mockAdminUsers: AdminUser[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    joinDate: new Date("2024-01-15"),
    subscription: "premium",
    booksOwned: 23,
    lastActive: new Date("2024-12-18"),
  },
  {
    id: "2",
    name: "Marcus Johnson",
    email: "marcus.j@email.com",
    joinDate: new Date("2024-03-20"),
    subscription: "free",
    booksOwned: 5,
    lastActive: new Date("2024-12-17"),
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    email: "elena.r@email.com",
    joinDate: new Date("2024-02-10"),
    subscription: "premium",
    booksOwned: 18,
    lastActive: new Date("2024-12-18"),
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@email.com",
    joinDate: new Date("2024-06-05"),
    subscription: "premium",
    booksOwned: 12,
    lastActive: new Date("2024-12-16"),
  },
  {
    id: "5",
    name: "Aisha Patel",
    email: "aisha.p@email.com",
    joinDate: new Date("2024-08-12"),
    subscription: "free",
    booksOwned: 3,
    lastActive: new Date("2024-12-15"),
  },
]
