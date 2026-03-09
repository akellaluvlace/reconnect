"use client";

import { PageHeader } from "@/components/ui/page-header";
import {
  CmsSimpleList,
  type CmsColumn,
} from "@/components/admin/cms-simple-list";
import { SKILLS_GUIDE_ITEMS } from "@/components/admin/cms-how-to-use";

const COLUMNS: CmsColumn[] = [
  {
    key: "name",
    label: "Skill Name",
    placeholder: "e.g. React, Project Management",
    required: true,
    width: "flex-[2]",
  },
  {
    key: "category",
    label: "Category",
    placeholder: "e.g. Technical, Soft Skills",
    required: false,
    width: "flex-1",
  },
];

export function SkillsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Manage your organisation's skills taxonomy. Skills appear in playbook wizards and AI-generated strategies."
      />
      <CmsSimpleList
        tableName="skills"
        columns={COLUMNS}
        addLabel="Add Skill"
        guideItems={SKILLS_GUIDE_ITEMS}
        guideTip="Skills you add here will be available across all playbooks in your organisation."
        noun="skills"
      />
    </div>
  );
}
