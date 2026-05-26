import "server-only";
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { magicLink } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins";
import nodemailer from "nodemailer";

/** Nodemailer transport — configured via SMTP_* env vars. */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

function createAuth() {
  const transporter = createTransport();

  return betterAuth({
    database: new Database(process.env.DATABASE_URL ?? "./tidatra.db"),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github", "authentik"], // add your providers
      },
    },

    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // In development without SMTP configured: print to console so you can
          // click the link without needing a real mail server.
          if (!process.env.SMTP_HOST) {
            if (process.env.NODE_ENV !== "production") {
              console.log(`[magic-link] ${email} → ${url}`);
              return;
            }
            throw new Error(
              "SMTP_HOST is not set. Configure SMTP to send magic links in production.",
            );
          }

          await transporter.sendMail({
            from:
              process.env.SMTP_FROM ??
              process.env.SMTP_USER ??
              "no-reply@tidatra.app",
            to: email,
            subject: "Sign in to TiDaTra",
            text: `Click the link below to sign in to TiDaTra:\n\n${url}\n\nThis link expires in 5 minutes.`,
            html: `
<p>Click the link below to sign in to <strong>TiDaTra</strong>:</p>
<p><a href="${url}">${url}</a></p>
<p>This link expires in 5 minutes.</p>
            `.trim(),
          });
        },
      }),

      // Authentik (or any OIDC-compatible provider) — enabled when env vars are set.
      ...(process.env.AUTHENTIK_CLIENT_ID
        ? [
            genericOAuth({
              config: [
                {
                  providerId: "authentik",
                  clientId: process.env.AUTHENTIK_CLIENT_ID!,
                  clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
                  discoveryUrl: `${process.env.AUTHENTIK_ISSUER}/.well-known/openid-configuration`,
                  scopes: ["openid", "email", "profile"],
                },
              ],
            }),
          ]
        : []),
    ],

    socialProviders: {
      ...(process.env.GITHUB_CLIENT_ID
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID!,
              clientSecret: process.env.GITHUB_CLIENT_SECRET!,
              overrideUserInfoOnSignIn: true,
            },
          }
        : {}),
      ...(process.env.GOOGLE_CLIENT_ID
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
              overrideUserInfoOnSignIn: true,
            },
          }
        : {}),
    },
  });
}

let cachedAuth: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  if (!cachedAuth) cachedAuth = createAuth();
  return cachedAuth;
}

export type Auth = ReturnType<typeof getAuth>;
