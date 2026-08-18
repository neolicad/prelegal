"use client";

import AuthForm from "./AuthForm";
import { signup } from "@/lib/api";

export default function SignupForm() {
  return (
    <AuthForm
      heading="Create your Prelegal account"
      submitLabel="Sign up"
      submittingLabel="Creating account…"
      passwordMinLength={8}
      onSubmit={signup}
      footerText="Already have an account?"
      footerLinkHref="/login"
      footerLinkText="Sign in"
    />
  );
}
