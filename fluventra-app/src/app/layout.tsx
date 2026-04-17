import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Fluventra — AI Speaking Academy",
  description:
    "Practice real conversations, improve fluency, and build confidence with Fluventra's AI-powered English speaking platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col relative overflow-x-hidden"
      >
        {/* Global Soothing Color Mesh */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          <div
            className="absolute top-[-15%] left-[-10%] w-[70vw] h-[70vw] sm:w-[60vw] sm:h-[60vw] rounded-full opacity-45 sm:opacity-50 blur-[80px] sm:blur-[120px] mix-blend-multiply mesh-blob-purple"
          />
          <div
            className="absolute top-[10%] right-[-15%] w-[80vw] h-[80vw] sm:w-[70vw] sm:h-[70vw] rounded-full opacity-35 sm:opacity-45 blur-[90px] sm:blur-[140px] mix-blend-multiply mesh-blob-pink"
          />
          <div
            className="absolute bottom-[0%] left-[5%] w-[70vw] h-[70vw] sm:w-[60vw] sm:h-[60vw] rounded-full opacity-35 sm:opacity-40 blur-[80px] sm:blur-[120px] mix-blend-multiply mesh-blob-cyan"
          />
          <div
            className="absolute bottom-[-10%] right-[10%] w-[60vw] h-[60vw] sm:w-[50vw] sm:h-[50vw] rounded-full opacity-30 sm:opacity-35 blur-[75px] sm:blur-[100px] mix-blend-multiply mesh-blob-indigo"
          />
        </div>
        {children}
      </body>
    </html>
  );
}
