import { getRules } from "@/modules/rules/rules.server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateGlobalRuleDialog } from "./create-global-rule-dialog";
import { BackofficeRulesTable } from "./backoffice-rules-table";

export default async function BackofficeRulesPage() {
  const rules = await getRules();

  const active   = rules.filter((r) => r.enabled).length;
  const inactive = rules.filter((r) => !r.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detection Rules - Global Catalogue"
        description={`${rules.length} rules · ${active} globally enabled · ${inactive} disabled`}
        action={
          <CreateGlobalRuleDialog>
            <Button size="sm"><Plus size={14} />New Rule</Button>
          </CreateGlobalRuleDialog>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary uppercase mb-1">Total Rules</p>
            <p className="text-2xl font-bold text-text-primary">{rules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary uppercase mb-1">Globally Enabled</p>
            <p className="text-2xl font-bold text-brand">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary uppercase mb-1">Globally Disabled</p>
            <p className="text-2xl font-bold text-text-muted">{inactive}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <BackofficeRulesTable rules={rules} />
        </CardContent>
      </Card>
    </div>
  );
}
