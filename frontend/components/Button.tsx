import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

// Purple Secondary is used for submit/CTA buttons -- see CLAUDE.md's Color
// Scheme. Add variants here if/when a second button style is actually
// needed, rather than speculatively ahead of time.
/** Shared submit/CTA button styling -- see CLAUDE.md's Color Scheme. */
export default function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}
