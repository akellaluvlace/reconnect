import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function VerifyPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Email verified</CardTitle>
        <CardDescription>
          Your email has been verified. You can now{" "}
          <Link href="/login" className="text-primary hover:underline">
            sign in
          </Link>
          .
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
