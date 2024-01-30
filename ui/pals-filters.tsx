'use client';
import { useState, useEffect } from 'react';
import { Filters } from '#/ui/filters';

interface PalsFiltersProps {
  pals: Pal[];
  onChange: (filtered: Pal[]) => void;
}

const attrs = ['无', '火', '草', '地', '雷', '水', '冰', '龙', '暗'].map(
  (value) => ({ label: value + '属性', value }),
);
const work = [
  '生火',
  '浇水',
  '播种',
  '发电',
  '手工',
  '采集',
  '伐木',
  '采矿',
  '制药',
  '冷却',
  '搬运',
  '牧场',
].map((v) => ({ label: v, value: v }));

export function PalsFilters(props: PalsFiltersProps) {
  const { pals, onChange } = props;
  const [selectedAttrs, setSelectedAttrs] = useState(['ALL']);
  const [selectedWorks, setSelectedWorks] = useState(['ALL']);

  useEffect(() => {
    const result = pals
      .filter((pal) => {
        return (
          selectedAttrs.includes('ALL') ||
          selectedAttrs.some((attr) => pal.attr.includes(attr))
        );
      })
      .filter((pal) => {
        return (
          selectedWorks.includes('ALL') ||
          selectedWorks.some((w) => pal.works.some((work) => work.type === w))
        );
      });
    onChange(result);
  }, [selectedAttrs, selectedWorks]);

  return (
    <div className="flex flex-col items-start gap-4 px-20 py-5">
      <Filters
        title="属性"
        options={attrs}
        value={selectedAttrs}
        onChange={setSelectedAttrs}
      />
      <Filters
        title="工作适应性"
        options={work}
        value={selectedWorks}
        onChange={setSelectedWorks}
      />
    </div>
  );
}
