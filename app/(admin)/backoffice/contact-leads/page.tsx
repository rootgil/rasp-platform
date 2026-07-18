import { listContactLeads } from "@/modules/admin/contact-leads.server";
import { PageHeader } from "@/components/shared/page-header";
import { ContactLeadsTable } from "./contact-leads-table";

export default async function ContactLeadsPage() {
  const leads = await listContactLeads();

  const pending = leads.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Leads"
        description={`${leads.length} total - ${pending} pending`}
      />
      <ContactLeadsTable leads={leads} />
    </div>
  );
}
