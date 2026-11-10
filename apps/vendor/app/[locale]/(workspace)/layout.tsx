import VendorApp from "@pocket/shared/vendor-app";

// /[locale], /owner/* and /staff/* share one workspace shell, so switching screens keeps
// the account, venue and loaded orders.
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <VendorApp>{children}</VendorApp>;
}
