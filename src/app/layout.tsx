import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grocery Price Compare",
  description: "Compare grocery prices across JioMart, Flipkart, Spencer's and Vishal Mega Mart",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
