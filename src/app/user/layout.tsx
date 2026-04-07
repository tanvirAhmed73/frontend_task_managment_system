import { UserShell } from "@/components/user-shell";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserShell>{children}</UserShell>;
}
