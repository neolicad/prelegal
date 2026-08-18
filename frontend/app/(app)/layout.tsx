import AppHeader from "@/components/AppHeader";

/**
 * Wraps every authenticated page (/, /documents/[slug], /my-documents) in the
 * persistent AppHeader -- a Next.js route group ((app)) so /login and
 * /signup, which render before there's a session to show, stay outside it.
 * URLs are unaffected: a route group contributes nothing to the path.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <AppHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
