import type { Metadata } from "next";
import { Urbanist, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://reconnect.io"),
  title: "Rec+onnect — Hire with clarity. Not chaos.",
  description:
    "AI-powered strategic recruitment platform for the Irish market. Create comprehensive hiring playbooks with market insights, structured interviews, and team coordination.",
  keywords: [
    "recruitment",
    "hiring",
    "AI recruitment",
    "Ireland",
    "HR tech",
    "interview planning",
    "hiring playbook",
    "recruitment platform",
  ],
  authors: [{ name: "Rec+onnect" }],
  openGraph: {
    title: "Rec+onnect — Hire with clarity. Not chaos.",
    description:
      "AI-powered strategic recruitment platform. Create hiring playbooks with market insights, interview planning, and team coordination.",
    url: "https://reconnect.io",
    siteName: "Rec+onnect",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rec+onnect — Hire with clarity. Not chaos.",
      },
    ],
    locale: "en_IE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rec+onnect — Hire with clarity. Not chaos.",
    description:
      "AI-powered strategic recruitment platform for the Irish market.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urbanist.variable} ${jakarta.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Rec+onnect",
              applicationCategory: "BusinessApplication",
              description:
                "AI-powered strategic recruitment platform for the Irish market",
              operatingSystem: "Web",
              url: "https://reconnect.io",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
                description: "Free trial — one playbook",
              },
            }),
          }}
        />
      </head>
      <body className="min-w-[1024px] antialiased">
        {children}

        {/* Google Analytics */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
