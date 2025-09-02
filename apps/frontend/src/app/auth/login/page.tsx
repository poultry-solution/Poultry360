import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-foreground">Poultry360</span>
          </Link>
        </div>
      </div>
      <div className="w-full max-w-md mx-auto bg-card border rounded-xl p-6 shadow-sm mt-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Log in to your account</p>
        </div>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="flex gap-2">
              <select
                id="countryCode"
                name="countryCode"
                defaultValue="+91"
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Country code"
              >
                <option value="+91">+91 (IN)</option>
                <option value="+977">+977 (NP)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
              </select>
              <Input id="phone" name="phone" type="tel" placeholder="98765 43210" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Log in</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          New to Poultry360? {" "}
          <Link href="/auth/signup" className="text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
