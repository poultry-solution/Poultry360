import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-foreground">Poultry360</span>
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card border rounded-xl p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Start managing your farms in minutes.</p>
        </div>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="farmName">Farm name</Label>
            <Input id="farmName" name="farmName" placeholder="Poultry360 Farms Pvt. Ltd." required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="province">Province (Nepal)</Label>
              <select
                id="province"
                name="province"
                defaultValue="Bagmati"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Koshi">Koshi Province</option>
                <option value="Madhesh">Madhesh Province</option>
                <option value="Bagmati">Bagmati Province</option>
                <option value="Gandaki">Gandaki Province</option>
                <option value="Lumbini">Lumbini Province</option>
                <option value="Karnali">Karnali Province</option>
                <option value="Sudurpashchim">Sudurpashchim Province</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (city / area)</Label>
              <Input id="location" name="location" placeholder="Bharatpur, Chitwan" required />
            </div>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farmsCount">Number of farms</Label>
              <Input id="farmsCount" name="farmsCount" type="number" min={1} placeholder="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalCapacity">Total capacity (birds)</Label>
              <Input id="totalCapacity" name="totalCapacity" type="number" min={1} placeholder="1000" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Sign up</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Already have an account? {" "}
          <Link href="/auth/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
      </div>
    </div>
  );
}
