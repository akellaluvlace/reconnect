import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, UserPlus, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { name: "Active Playbooks", value: "0", icon: BookOpen },
    { name: "Total Candidates", value: "0", icon: Users },
    { name: "Team Members", value: "0", icon: UserPlus },
    { name: "Interviews This Week", value: "0", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your recruitment operations"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
