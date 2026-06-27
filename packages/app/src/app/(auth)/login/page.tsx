import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in — co14ners" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <LoginForm redirect={redirect} />;
}
