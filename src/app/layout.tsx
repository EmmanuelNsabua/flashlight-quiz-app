import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmashBuzzer — Real-Time Quiz Game",
  description: "A real-time multiplayer quiz game for the Flashlight University English Club.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
