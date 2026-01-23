import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Image from "next/image"

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(127,255,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(255,215,0,0.08),transparent_50%)]" />

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
                <form className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground" htmlFor="login-email">
                      EMAIL OR USERNAME
                    </label>
                    <Input id="login-email" placeholder="you@komet.explorer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground" htmlFor="login-password">
                      PASSWORD
                    </label>
                    <Input id="login-password" type="password" placeholder="••••••••" />
                  </div>
                  <Button className="w-full text-lg py-6 font-display tracking-wider" size="lg">
                    LOGIN TO KANE'S KOMETS
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground" htmlFor="register-email">
                      EMAIL
                    </label>
                    <Input id="register-email" placeholder="you@komet.explorer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground" htmlFor="register-username">
                      USERNAME
                    </label>
                    <Input id="register-username" placeholder="komet_reader" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground" htmlFor="register-password">
                      PASSWORD
                    </label>
                    <Input id="register-password" type="password" placeholder="••••••••" />
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
    </div>
  )
}
