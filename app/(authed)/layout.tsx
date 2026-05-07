import Sidebar from "@/components/layout/Sidebar";

export default function AuthedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col">{children}</main>
    </div>
  );
}
