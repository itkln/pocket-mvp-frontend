import PasswordRecoveryPage from "@pocket/shared/password-recovery-page";
import { queryValue, type DishSearchParams } from "@pocket/lib/dish-links";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: DishSearchParams;
}) {
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
