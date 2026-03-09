"use client";

import { PageHeader } from "@/components/ui/page-header";
import {
  CmsSimpleList,
  type CmsColumn,
} from "@/components/admin/cms-simple-list";
import { LEVELS_GUIDE_ITEMS } from "@/components/admin/cms-how-to-use";

const COLUMNS: CmsColumn[] = [
  {
    key: "name",
    label: "Level Name",
    placeholder: "e.g. Graduate, Mid-Level, Senior",
    required: true,
    width: "flex-1",
  },
  {
    key: "description",
    label: "Description",
    placeholder: "e.g. 0-2 years experience",
    required: false,
    width: "flex-[2]",
  },
];

export function LevelsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Levels"
        description="Manage seniority levels. Use the arrows to set the order from most junior to most senior."
      />
      <CmsSimpleList
        tableName="levels"
        columns={COLUMNS}
        addLabel="Add Level"
        guideItems={LEVELS_GUIDE_ITEMS}
        guideTip="Levels determine seniority options in the playbook creation wizard. Order them from most junior (top) to most senior (bottom)."
        showReorder
        noun="levels"
      />
    </div>
  );
}
