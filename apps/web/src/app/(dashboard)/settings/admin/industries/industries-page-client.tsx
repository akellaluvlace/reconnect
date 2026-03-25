"use client";

import { PageHeader } from "@/components/ui/page-header";
import {
  CmsSimpleList,
  type CmsColumn,
} from "@/components/admin/cms-simple-list";
import { INDUSTRIES_GUIDE_ITEMS } from "@/components/admin/cms-how-to-use";

const COLUMNS: CmsColumn[] = [
  {
    key: "name",
    label: "Industry Name",
    placeholder: "e.g. Technology, Financial Services",
    required: true,
  },
];

export function IndustriesPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Industries"
        description="Manage industry categories. Industries help the AI tailor market research and hiring strategies."
      />
      <CmsSimpleList
        tableName="industries"
        columns={COLUMNS}
        addLabel="Add Industry"
        guideItems={INDUSTRIES_GUIDE_ITEMS}
        guideTip="Industries you define here will appear in hiring plan creation dropdowns."
        noun="industries"
      />
    </div>
  );
}
