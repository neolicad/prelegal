"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Button from "./Button";
import { type CurrentUser, DocumentChatApiError, navigateFullPage } from "@/lib/api";
import { errorTextClass, inputClass } from "@/lib/ui";

interface AuthFormProps {
  heading: string;
  submitLabel: string;
  submittingLabel: string;
  passwordMinLength?: number;
  onSubmit: (email: string, password: string) => Promise<CurrentUser>;
  footerText: string;
  footerLinkHref: string;
  footerLinkText: string;
}

/** Shared shape of LoginForm and SignupForm -- same fields, same submit/error/redirect flow. */
export default function AuthForm({
  heading,
  submitLabel,
  submittingLabel,
  passwordMinLength,
  onSubmit,
  footerText,
  footerLinkHref,
  footerLinkText,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(email, password);
      navigateFullPage("/");
    } catch (err) {
      setError(err instanceof DocumentChatApiError ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-brand-navy">{heading}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-800">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-800">Password</span>
          <input
            required
            minLength={passwordMinLength}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        {error ? <p className={errorTextClass}>{error}</p> : null}
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </form>
      <p className="mt-6 text-sm text-neutral-600">
        {footerText}{" "}
        <Link href={footerLinkHref} className="font-medium text-brand-blue hover:underline">
          {footerLinkText}
        </Link>
      </p>
    </div>
  );
}
