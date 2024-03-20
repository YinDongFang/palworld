import '#/styles/globals.css';
import '#/styles/mapbox-gl.css';
import { GlobalNav } from '#/ui/global-nav';
import { Metadata } from 'next';
import '#/app/connect';

export const metadata: Metadata = {
  title: {
    default: 'Palworld Tools',
    template: '%s | Palworld Tools',
  },
  description:
    'A playground to explore new Palworld Tools features such as nested layouts, instant loading states, streaming, and component level data fetching.',
  openGraph: {
    title: 'Palworld Tools Playground',
    description:
      'A playground to explore new Palworld Tools features such as nested layouts, instant loading states, streaming, and component level data fetching.',
    images: [`/api/og?title=Palworld Tools`],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full [color-scheme:dark]">
      <body className="flex h-full flex-col">
        <GlobalNav />
        <div className="min-h-0 grow overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
