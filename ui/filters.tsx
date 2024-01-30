interface FiltersProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  title: string;
  titleWidth?: number;
}

export function Filters(props: FiltersProps) {
  const { options, value, onChange, title, titleWidth = 100 } = props;

  const all = { label: '全部', value: 'ALL' };

  const toggle = (option: any) => {
    if (value.includes(option.value)) {
      onChange(value.filter((item) => item !== option.value));
    } else {
      if (option.value === 'ALL') {
        onChange(['ALL']);
      } else {
        onChange([...value, option.value].filter((item) => item !== 'ALL'));
      }
    }
  };

  return (
    <div className="flex gap-4">
      <span className="shrink-0 text-right" style={{ width: titleWidth }}>
        {title}：
      </span>
      <div className="flex flex-wrap gap-x-4 gap-y-3 text-[14px]">
        {[all, ...options].map((option) => {
          const selected = value.includes(option.value);
          return (
            <div
              key={option.value}
              className="cursor-pointer select-none border border-solid px-4 py-1"
              onClick={() => toggle(option)}
              style={{
                color: selected ? 'white' : '#666',
                borderColor: selected ? '#bb978b' : '#666',
                backgroundColor: selected ? '#bb978b' : 'unset',
              }}
            >
              {option.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
