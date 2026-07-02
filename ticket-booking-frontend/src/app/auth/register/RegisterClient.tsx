"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Container } from "@/shared/components/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function RegisterClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  const [step, setStep] = useState<"register" | "verify">("register");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const { register, confirmRegistration } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      await register(email, password);
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await confirmRegistration(email, verificationCode);
      // Registration complete, route to login
      router.push("/auth/login?registered=true");
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-20 flex justify-center">
      <div className="w-full max-w-md bg-card p-8 rounded-xl border border-border shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            {step === "register" ? "Create Account" : "Verify Email"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {step === "register" 
              ? "Join us to book tickets for the biggest events" 
              : `We sent a verification code to ${email}`}
          </p>
        </div>

        {step === "register" ? (
          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </Button>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-4 bg-primary/10 rounded-lg flex gap-3 text-sm text-primary mb-6">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p>Please check your email inbox and spam folder for the verification code.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input 
                id="code" 
                type="text" 
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify Account"}
            </Button>
          </form>
        )}
      </div>
    </Container>
  );
}
