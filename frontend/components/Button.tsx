import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-brand-purple text-white hover:opacity-90",
  ghost: "border border-neutral-300 text-neutral-700 hover:bg-neutral-50",
};

/** Shared button styling for primary/secondary actions -- see CLAUDE.md's Color Scheme. */
export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
    />
  );
}
