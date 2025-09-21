import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StreamInputProps {
  value: string;
  onChange: (value: string) => void;
  shortcuts: { symbol: string; value: string }[];
  disabled: boolean;
  activeStream: string | null;
  placeholder: string;
}

export function StreamInput({
  value,
  onChange,
  shortcuts,
  disabled,
  activeStream,
  placeholder,
}: StreamInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor="ws-stream-input">
        Stream
      </label>
      <Input
        id="ws-stream-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {shortcuts.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Atajos:</span>
          {shortcuts.map((shortcut) => (
            <Button
              key={shortcut.value}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(shortcut.value)}
              disabled={disabled && shortcut.value !== activeStream}
            >
              {shortcut.symbol}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
