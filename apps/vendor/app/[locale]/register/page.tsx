import AuthPage from "@pocket/shared/auth-page";
import { queryValue, type SearchParams } from "@pocket/lib/route-params";

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  return <AuthPage mode="register" product="vendor" returnTo={queryValue(query.returnTo)} />;
}
