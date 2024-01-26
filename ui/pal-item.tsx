import Image from 'next/image';
import React, { useRef } from 'react';
import { useInViewport } from 'ahooks';

interface PalItemProps {
  pal: Pal;
  onClick?: () => void;
}

function Attribute({ value }: { value: string }) {
  const colorMap = {
    水: '#1b72d3',
    雷: '#d0ac0d',
    火: '#df512b',
    地: '#90521f',
    草: '#65a600',
    无: '#bb978b',
    暗: '#aa1151',
    龙: '#a74cc3',
    冰: '#1bb3b8',
  };
  return (
    <div
      className="flex items-center gap-1 border border-solid border-white px-2 py-0.5 text-[13px]"
      style={{
        backgroundColor: colorMap[value],
        boxShadow: `1 1 1 1px ${colorMap[value]}`,
      }}
    >
      <Image
        className="h-[20px] w-[20px] object-contain"
        width={50}
        height={50}
        src={`/icons/${value}.png`}
      />
      <span>{value}属性</span>
    </div>
  );
}

function WorkItem({ name, level }: { name: string; level: number }) {
  return (
    <div className="relative flex items-center gap-2">
      <Image
        className="h-[16px] w-[16px] object-contain"
        width={16}
        height={16}
        src={`/icons/${name}.png`}
      />
      <span>{name}</span>
      <span className="ml-2 text-[12px]">
        Lv<span className="text-[16px]">{level}</span>
      </span>
    </div>
  );
}

function BreedCount({ count }: { count: number }) {
  return (
    <div className="flex items-center">
      <span>进食量：</span>
      <div className="flex gap-1">
        {new Array(count).fill(0).map((_) => (
          <Image
            className="h-[16px] w-[16px] object-contain"
            width={16}
            height={16}
            src="/icons/breed.png"
          />
        ))}
      </div>
    </div>
  );
}

function DropItems({ items }: { items: string[] }) {
  return <div>掉落道具：{items.join('、')}</div>;
}

export function PalItem(props: PalItemProps) {
  const { pal, onClick } = props;
  const { code, name, attr, work, eat, items } = pal;

  const ref = useRef(null);
  const [inViewport] = useInViewport(ref);

  const renderContent = () => {
    return (
      <>
        <Image
          src={`/pals/${code}.png`}
          width={80}
          height={80}
          className="h-[80px] w-[80px] object-contain"
        />
        <div className="flex flex-1 flex-col items-start justify-between">
          <div className="flex w-full flex-wrap gap-2">
            <div>
              <span className="text-[12px]">No.</span>
              <span className="text-[16px]">{code}</span>
            </div>
            <div className="text-[16px]">{name}</div>
            <div className="ml-1 flex gap-1">
              {attr.map((v) => (
                <Attribute value={v} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {Object.entries(work).map(([name, level]) => (
              <WorkItem name={name} level={level} />
            ))}
          </div>
          <BreedCount count={eat} />
          <DropItems items={items} />
        </div>
      </>
    );
  };

  return (
    <div
      className="flex h-[200px] w-[450px] cursor-pointer gap-4 rounded-lg bg-gray-800 p-4 text-[14px] shadow-lg shadow-black"
      onClick={onClick}
      ref={ref}
    >
      {inViewport ? renderContent() : null}
    </div>
  );
}
