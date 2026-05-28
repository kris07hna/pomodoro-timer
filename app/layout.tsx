import type { Metadata } from "next";
import "./globals.css";
import SnowOverlay from "@/components/snowfall";

export const metadata: Metadata = {
  title: "Pomodoro Timer",
  description: "A simple pomodoro timer with focus, break, history, and sound cues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SnowOverlay />
        {children}
      </body>
    </html>
  );
}
