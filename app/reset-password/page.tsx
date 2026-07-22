import { redirect } from "next/navigation";

export default async function ResetPasswordRedirect({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? `?token=${encodeURIComponent(query.token)}` : "";
  redirect(`/ru/reset-password${token}`);
}
