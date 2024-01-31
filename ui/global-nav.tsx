'use client';

import { router, type Item } from '#/lib/router';
import palworld from '#/public/palworld.webp';
import Link from 'next/link';
import Image from 'next/image';
import { useSelectedLayoutSegment } from 'next/navigation';
import clsx from 'clsx';

export function GlobalNav() {
  return (
    <div className="z-10 flex w-full items-center justify-between border-b border-gray-800 bg-black px-10">
      <Link href="/" className="group flex w-full items-center gap-x-2.5">
        <Image
          src={palworld}
          alt="Palworld Tools"
          className="h-16 object-contain"
        />
      </Link>
      <nav className="flex shrink-0 items-center gap-x-4">
        {router.map((item) => {
          return <GlobalNavItem key={item.slug} item={item} />;
        })}
      </nav>
    </div>
  );
}

function GlobalNavItem({ item }: { item: Item }) {
  const segment = useSelectedLayoutSegment();
  const isActive = item.slug === segment;

  return (
    <Link
      href={`/${item.slug}`}
      className={clsx(
        'fit-content block rounded-md px-3 py-2 text-sm font-medium hover:text-gray-300',
        {
          'text-gray-400 hover:bg-gray-800': !isActive,
          'text-white': isActive,
        },
      )}
    >
      {item.name}
    </Link>
  );
}
