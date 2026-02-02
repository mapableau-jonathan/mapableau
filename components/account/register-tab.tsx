"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

interface RegisterTabProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  onClose: () => void;
}

/**
 * Get user initials from name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function RegisterTab({ user, onClose }: RegisterTabProps) {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string[]>([]);
  const [accessPreferences, setAccessPreferences] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (roleValue: string) => {
    setRole((prev) =>
      prev.includes(roleValue)
        ? prev.filter((r) => r !== roleValue)
        : [...prev, roleValue]
    );
  };

  const handlePreferenceChange = (pref: string) => {
    setAccessPreferences((prev) =>
      prev.includes(pref)
        ? prev.filter((p) => p !== pref)
        : [...prev, pref]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // If user is already logged in, this is a profile update (future enhancement)
      if (user) {
        setError("Profile updates coming soon. Please use the account settings.");
        setIsLoading(false);
        return;
      }

      const result = await register({
        email,
        password,
        name: name || email.split("@")[0], // Use provided name or default from email
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await signOut({ redirect: false });
      onClose();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {user ? (
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.image || undefined} alt={user.name || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-primary">
              Hi, {user.name?.split(" ")[0] || "there"}!
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ) : (
        <h2 className="text-2xl font-bold text-primary">Create Your Account</h2>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!user && (
          <div className="space-y-2">
            <label htmlFor="register-name" className="text-sm font-medium">
              Full Name
            </label>
            <Input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-label="Full Name"
              minLength={2}
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="register-email" className="text-sm font-medium">
            Email Address
          </label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!user}
            aria-label="Email Address"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className="text-sm font-medium">
            Choose a Password
          </label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!user}
            aria-label="Choose a Password"
            minLength={8}
          />
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">I am a:</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
              <input
                type="checkbox"
                checked={role.includes("disability")}
                onChange={() => handleRoleChange("disability")}
                className="rounded border-input"
                aria-label="Person with Disability"
              />
              <span className="text-sm">Person with Disability</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
              <input
                type="checkbox"
                checked={role.includes("supporter")}
                onChange={() => handleRoleChange("supporter")}
                className="rounded border-input"
                aria-label="Supporter / Carer"
              />
              <span className="text-sm">Supporter / Carer</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
              <input
                type="checkbox"
                checked={role.includes("provider")}
                onChange={() => handleRoleChange("provider")}
                className="rounded border-input"
                aria-label="Service Provider (optional)"
              />
              <span className="text-sm">
                Service Provider <span className="text-muted-foreground">(optional)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Access Preferences */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Access Preferences:</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
              <input
                type="checkbox"
                checked={accessPreferences.includes("wheelchair")}
                onChange={() => handlePreferenceChange("wheelchair")}
                className="rounded border-input"
                aria-label="Wheelchair Accessible"
              />
              <span className="text-sm">Wheelchair Accessible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
              <input
                type="checkbox"
                checked={accessPreferences.includes("low-sensory")}
                onChange={() => handlePreferenceChange("low-sensory")}
                className="rounded border-input"
                aria-label="Low Sensory Environment (optional)"
              />
              <span className="text-sm">
                Low Sensory Environment{" "}
                <span className="text-muted-foreground">(optional)</span>
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div
            className="text-sm text-destructive bg-destructive/10 p-3 rounded-md"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="secondary"
          className="w-full bg-secondary text-secondary-foreground"
          disabled={isLoading || !!user}
        >
          {isLoading
            ? "Creating account..."
            : user
              ? "Profile Update (Coming Soon)"
              : "Sign Up"}
        </Button>
      </form>

      {/* Terms & Privacy */}
      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our{" "}
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/terms");
          }}
          className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
        >
          Terms
        </button>{" "}
        &{" "}
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/privacy");
          }}
          className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
        >
          Privacy Policy
        </button>
        .
      </p>

      {/* Log Out Button (if logged in) */}
      {user && (
        <div className="pt-4 border-t">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      )}
    </div>
  );
}
