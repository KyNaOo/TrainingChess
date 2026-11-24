import type { Metadata } from "next";
import { strings } from "@/lib/strings";
import "./globals.css";

export const metadata: Metadata = {
  title: strings.site.name,
  description: strings.site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
