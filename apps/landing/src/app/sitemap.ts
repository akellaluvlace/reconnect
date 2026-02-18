import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://reconnect.io",
      lastModified: new Date("2026-02-18"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
