
import { useTheme } from './ThemeContext';

export type ThemeSwitcherProps = {
  className?: string;
};

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  return (
    <select
      className={className}
      value={theme}
      onChange={(event) => setTheme(event.target.value as 'earth' | 'night' | 'clean-slate')}
    >
      <option value="earth">Sienna Clay</option>
      <option value="night">Night Watch</option>
      <option value="clean-slate">Clean Slate</option>
    </select>
  );
}
