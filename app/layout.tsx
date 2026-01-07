import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trytraintrack.net";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TrainTrack - Personal Trainer Software for Scheduling & Invoicing",
    template: "%s | TrainTrack",
  },
  description:
    "The simple back-office app for personal trainers. Manage client scheduling, automate invoices, and track revenue. Built for independent trainers and small studios.",
  keywords: [
    "personal trainer software",
    "personal training management",
    "fitness trainer scheduling",
    "personal trainer tools",
    "training business software",
    "client management for trainers",
    "trainer invoicing app",
    "fitness business management",
  ],
  authors: [{ name: "TrainTrack" }],
  creator: "TrainTrack",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "TrainTrack",
    title: "TrainTrack - Personal Trainer Software for Scheduling & Invoicing",
    description:
      "The simple back-office app for personal trainers. Manage scheduling, automate invoices, and track revenue.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrainTrack - Personal Trainer Software",
    description:
      "The simple back-office app for personal trainers. Manage scheduling, invoices, and revenue tracking.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TrainTrack",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "The simple back-office app for personal trainers. Manage client scheduling, automate invoices, and track revenue.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free beta access for early adopters",
  },
  featureList: [
    "Client scheduling and calendar management",
    "Automated invoice generation",
    "Revenue tracking and reporting",
    "Google Calendar sync",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
