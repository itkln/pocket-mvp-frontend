import PasswordRecoveryPage from "@pocket/shared/password-recovery-page";
import { queryValue, type SearchParams } from "@pocket/lib/route-params";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  return (
    <PasswordRecoveryPage
      mode="request"
      product="dish"
      token={queryValue(query.token) ?? ""}
      returnTo={queryValue(query.returnTo)}
    />
  );
}
