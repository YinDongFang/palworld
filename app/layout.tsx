import '#/styles/globals.css';
import { GlobalNav } from '#/ui/global-nav';
import { Metadata } from 'next';

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
    <html lang="en" className="[color-scheme:dark]">
      <body>
        <GlobalNav />
        <div className="absolute bottom-0 left-72 right-0 top-0">
          {children}
        </div>
      </body>
    </html>
  );
}
