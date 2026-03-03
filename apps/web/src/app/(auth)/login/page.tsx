import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; session_expired?: string }>;
}) {
  const { error, session_expired } = await searchParams;
  return <LoginForm authError={error} sessionExpired={session_expired === "true"} />;
}
