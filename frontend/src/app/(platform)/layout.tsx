// src/app/(platform)/layout.tsx
//
// Platform route group layout. Only wraps with admin-specific providers.
// NO tenant providers, NO tenant context — fully isolated.

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
