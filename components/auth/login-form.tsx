"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { t } from "@/lib/i18n/en";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EnabledProviders {
  github: boolean;
  google: boolean;
  authentik: boolean;
}

export function LoginForm({ providers }: { providers: EnabledProviders }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/",
    });

    if (err) {
      setError(t.auth.errorSendingLink);
      setLoading(false);
    } else {
      setSent(true);
    }
  };

  const hasOAuth = providers.github || providers.google || providers.authentik;

  if (sent) {
    return (
      <div className="w-full max-w-sm space-y-3 text-center">
        <p className="text-sm">{t.auth.magicLinkSent}</p>
        <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.auth.signInTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.auth.signInDescription}
        </p>
      </div>

      <form onSubmit={handleMagicLink} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.emailLabel}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t.auth.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t.common.loading : t.auth.sendMagicLink}
        </Button>
      </form>

      {hasOAuth && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t.auth.orContinueWith}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {providers.github && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  authClient.signIn.social({
                    provider: "github",
                    callbackURL: "/",
                  })
                }
              >
                {t.auth.signInWithGitHub}
              </Button>
            )}

            {providers.google && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  authClient.signIn.social({
                    provider: "google",
                    callbackURL: "/",
                  })
                }
              >
                {t.auth.signInWithGoogle}
              </Button>
            )}

            {providers.authentik && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  authClient.signIn.oauth2({
                    providerId: "authentik",
                    callbackURL: "/",
                  })
                }
              >
                {t.auth.signInWithAuthentik}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
