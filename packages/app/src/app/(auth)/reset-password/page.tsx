import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset password — co14ners" };

export default function ResetPasswordPage() {
  // Suspense required because ResetPasswordForm uses useSearchParams()
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
