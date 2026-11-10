import StaffInvitationPage from "@pocket/shared/staff-invitation-page";
import { queryValue, type SearchParams } from "@pocket/lib/route-params";

export default async function InvitePage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  return <StaffInvitationPage token={queryValue(query.token) ?? ""} />;
}
