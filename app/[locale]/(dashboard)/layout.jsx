import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-utils";

/**
 * Server-side gate for the whole dashboard route group.
 *
 * The middleware does NOT protect these routes: `middleware.ts` wraps `auth()`
 * with its own handler, which means the `authorized` callback in
 * `lib/auth.config.ts` never runs. Before this file existed, an anonymous
 * request to `/ar/dashboard/...` was answered with the full admin shell and
 * only a client-side redirect in the browser pushed the user away.
 *
 * This renders nothing of its own — it only decides whether the children are
 * allowed to render at all, so the dashboard UI is unchanged.
 */
export default async function DashboardGroupLayout({ children }) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/");
  }

  if (user.role !== "ADMIN" && user.role !== "EMPLOYEE") {
    redirect("/");
  }

  return children;
}
