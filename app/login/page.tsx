import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in – TiDaTra",
};

export default function LoginPage() {
  // Detect which providers are enabled server-side so we can pass them as
  // plain props to the client form — no public env vars required.
  const providers = {
    github: !!process.env.GITHUB_CLIENT_ID,
    google: !!process.env.GOOGLE_CLIENT_ID,
    authentik: !!process.env.AUTHENTIK_CLIENT_ID,
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoginForm providers={providers} />
    </div>
  );
}
