import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Manual Text → JSON",
  description: "Convert structured manual text into JSON and view existing Act JSON files."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

