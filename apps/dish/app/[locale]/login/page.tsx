import AuthPage from "@pocket/shared/auth-page";
import { queryValue, type DishSearchParams } from "@pocket/lib/dish-links";

export default async function LoginPage({ searchParams }: { searchParams: DishSearchParams }) {
  const query = await searchParams;
  return <AuthPage mode="login" product="dish" returnTo={queryValue(query.returnTo)} />;
}
