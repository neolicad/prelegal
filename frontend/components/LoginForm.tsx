"use client";

import AuthForm from "./AuthForm";
import { login } from "@/lib/api";

export default function LoginForm() {
  return (
    <AuthForm
      heading="Sign in to Prelegal"
      submitLabel="Sign in"
      submittingLabel="Signing in…"
      onSubmit={login}
      footerText="Don't have an account?"
      footerLinkHref="/signup"
      footerLinkText="Sign up"
    />
  );
}
