"use client";

import { Buildings, Users, Briefcase } from "@phosphor-icons/react";

interface StatsCardsProps {
  totalOrgs: number;
  totalUsers: number;
  totalPlaybooks: number;
}

export function StatsCards({
  totalOrgs,
  totalUsers,
  totalPlaybooks,
}: StatsCardsProps) {
  const cards = [
    { label: "Organisations", count: totalOrgs, icon: Buildings },
    { label: "Users", count: totalUsers, icon: Users },
    { label: "Hiring Plans", count: totalPlaybooks, icon: Briefcase },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-border/40 bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                <Icon size={20} weight="duotone" className="text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {card.count}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {card.label}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
