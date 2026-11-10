import AuthPage from "@pocket/shared/auth-page";
import { queryValue, type SearchParams } from "@pocket/lib/route-params";

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  return <AuthPage mode="login" product="vendor" returnTo={queryValue(query.returnTo)} />;
}
