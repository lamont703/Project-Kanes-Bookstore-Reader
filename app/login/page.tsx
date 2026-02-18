"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { ShoppingCart } from "lucide-react"

import { toast } from "sonner"

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/"
  const message = searchParams.get("message")

  // Registration State
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    password: "",
    confirmPassword: ""
  })
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock login
    localStorage.setItem("komet_subscription_active", "true")
    setTimeout(() => {
      window.dispatchEvent(new Event("storage"))
      router.push(redirectPath)
    }, 100)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, boolean> = {}

    if (regData.password.length < 8) {
      newErrors.password = true
      toast.error("Password must be at least 8 characters long")
    }

    if (regData.password !== regData.confirmPassword) {
      newErrors.confirmPassword = true
      toast.error("Passwords do not match")
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      // Mock registration
      localStorage.setItem("komet_subscription_active", "true")
      toast.success("Account created successfully!")
      setTimeout(() => {
        window.dispatchEvent(new Event("storage"))
        router.push(redirectPath)
      }, 100)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto relative">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-3 mb-4">
          <Image
            src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png"
            alt="Kane's Komets Logo"
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-contain"
          />
          <span className="font-display text-3xl tracking-wider text-primary">KANE'S KOMETS</span>
        </Link>
        <h1 className="font-display text-4xl tracking-wider text-balance">
          <span className="text-primary">WELCOME TO THE</span> <span className="text-secondary">KANE'S KOMETS BOOK APP</span>
        </h1>
      </div>

      {message === "purchase" && (
        <Alert className="mb-6 border-primary/50 bg-primary/10">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-bold tracking-wide">Checkout Pending</AlertTitle>
          <AlertDescription>
            Please sign in or register to complete your purchase. Your cart items are safe!
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-1 bg-card/50 backdrop-blur border-primary/20">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
            <TabsTrigger
              value="login"
              className="py-3 text-lg font-display tracking-wider rounded-t-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              LOGIN
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="py-3 text-lg font-display tracking-wider rounded-t-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              REGISTER
            </TabsTrigger>
          </TabsList>
          <div className="p-6">
            <TabsContent value="login">
              <form className="space-y-6" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="login-email">
                    EMAIL
                  </label>
                  <Input id="login-email" type="email" placeholder="you@komet.explorer" required defaultValue="demo@komet.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="login-password">
                    PASSWORD
                  </label>
                  <Input id="login-password" type="password" placeholder="••••••••" required defaultValue="password" />
                </div>
                <Button className="w-full text-lg py-6 font-display tracking-wider" size="lg">
                  LOGIN TO KANE'S KOMETS
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="register-name">
                    FULL NAME
                  </label>
                  <Input
                    id="register-name"
                    placeholder="John Doe"
                    required
                    value={regData.name}
                    onChange={e => setRegData({ ...regData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="register-email">
                    EMAIL
                  </label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@komet.explorer"
                    required
                    value={regData.email}
                    onChange={e => setRegData({ ...regData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="register-phone">
                    PHONE NUMBER
                  </label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    required
                    value={regData.phone}
                    onChange={e => setRegData({ ...regData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="register-dob">
                    DATE OF BIRTH
                  </label>
                  <Input
                    id="register-dob"
                    type="date"
                    required
                    value={regData.dob}
                    onChange={e => setRegData({ ...regData, dob: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="register-password">
                    PASSWORD
                  </label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className={errors.password ? "border-destructive/50 ring-1 ring-destructive/20" : ""}
                    value={regData.password}
                    onChange={e => setRegData({ ...regData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="register-confirm-password">
                    CONFIRM PASSWORD
                  </label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className={errors.confirmPassword ? "border-destructive/50 ring-1 ring-destructive/20" : ""}
                    value={regData.confirmPassword}
                    onChange={e => setRegData({ ...regData, confirmPassword: e.target.value })}
                  />
                </div>
                <Button className="w-full text-lg py-6 font-display tracking-wider" size="lg">
                  CREATE ACCOUNT
                </Button>
              </form>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  )
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(127,255,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(255,215,0,0.08),transparent_50%)]" />

      <Suspense fallback={<div>Loading...</div>}>
        <AuthContent />
      </Suspense>
    </div>
  )
}
