import { Tab } from '#/ui/tab';
import React from 'react';
import { RandomPostTab } from './random-post-tab';

const title = 'Static Data';

export const metadata = {
  title,
  openGraph: {
    title,
    images: [`/api/og?title=${title}`],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
