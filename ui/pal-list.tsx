'use client';
import { useState } from 'react';
import { PalItem } from '#/ui/pal-item';
import { PalsFilters } from '#/ui/pals-filters';

export function PalList(props: { pals: Pal[]; onSelect?: (pal: Pal) => void }) {
  const { pals, onSelect } = props;
  const [filterdPals, setFilteredPals] = useState(pals);

  return (
    <div className="flex h-full flex-col">
      <PalsFilters pals={pals} onChange={setFilteredPals} />
      {filterdPals.length ? (
        <div className="flex flex-1 flex-wrap justify-evenly gap-x-10 gap-y-8 overflow-y-auto px-20 py-10">
          {filterdPals.map((pal) => (
            <PalItem pal={pal} key={pal.code} onClick={() => onSelect?.(pal)} />
          ))}
          <div className="w-[450px]"></div>
          <div className="w-[450px]"></div>
          <div className="w-[450px]"></div>
        </div>
      ) : (
        <div className="mt-20 text-center">没有找到匹配的帕鲁</div>
      )}
    </div>
  );
}
