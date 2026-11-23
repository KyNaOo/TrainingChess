import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opening Trainer",
  description: "Apprendre une ouverture d'échecs en une session, gratuitement et sans compte.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
