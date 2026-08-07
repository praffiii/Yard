import { Monitor, Moon, Sun } from '@phosphor-icons/react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group.js';
import { useTheme, type ThemePreference } from './theme-provider.js';

const options: ReadonlyArray<
  Readonly<{
    icon: typeof Monitor;
    label: string;
    value: ThemePreference;
  }>
> = [
  { icon: Monitor, label: 'System', value: 'system' },
  { icon: Sun, label: 'Light', value: 'light' },
  { icon: Moon, label: 'Dark', value: 'dark' },
];

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <ToggleGroup
      aria-label="Color theme"
      className="rounded-md border border-border bg-muted p-1"
      onValueChange={(values) => {
        const value = values[0];
        if (value === 'system' || value === 'light' || value === 'dark') {
          setPreference(value);
        }
      }}
      value={[preference]}
    >
      {options.map(({ icon: Icon, label, value }) => (
        <ToggleGroupItem aria-label={`${label} theme`} key={value} value={value}>
          <Icon aria-hidden="true" size={17} weight="regular" />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
