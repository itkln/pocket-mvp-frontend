import AuthPage from "@pocket/shared/auth-page";
import { queryValue, type DishSearchParams } from "@pocket/lib/dish-links";

export default async function RegisterPage({ searchParams }: { searchParams: DishSearchParams }) {
  const query = await searchParams;
  return <AuthPage mode="register" product="dish" returnTo={queryValue(query.returnTo)} />;
}
