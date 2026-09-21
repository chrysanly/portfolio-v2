import type { MetadataRoute } from 'next';
import { getAllProjects } from '@/lib/projects';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chrys.dev';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ['', '/work', '/about', '/contact'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const projects = (await getAllProjects()).map((project) => ({
    url: `${base}/work/${project.slug}`,
    lastModified: new Date(),
  }));

  return [...routes, ...projects];
}
