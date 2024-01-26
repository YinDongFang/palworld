interface FiltersProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function Filters(props: FiltersProps) {
  const { options, value, onChange } = props;

  const all = { label: '全部', value: 'ALL' };

  const toggle = (option) => {
    if (value.includes(option.value)) {
      onChange(value.filter((item) => item !== option.value));
    } else {
      if (option.value === 'ALL') {
        onChange('ALL');
      } else {
        onChange([...value, option.value].filter((item) => item !== 'ALL'));
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 text-[14px]">
      {[all, ...options].map((option) => {
        const selected = value.includes(option.value);
        return (
          <div
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
  );
}
