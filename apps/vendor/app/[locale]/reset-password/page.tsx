import PasswordRecoveryPage from "@pocket/shared/password-recovery-page";
import { queryValue, type SearchParams } from "@pocket/lib/route-params";

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  return (
    <PasswordRecoveryPage mode="reset" product="vendor" token={queryValue(query.token) ?? ""} />
  );
}
