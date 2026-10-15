import { Suspense } from "react";
import { Dateline, Headline, Masthead, Page } from "@/components/ui";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <Masthead title="Team Builder" />
      <Page>
        <Headline>Sign in</Headline>
        <Dateline>Use your Google account. Your group is waiting.</Dateline>
        <div className="mt-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </Page>
    </>
  );
}
