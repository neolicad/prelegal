import Button from "./Button";
import { inputClass } from "@/lib/ui";

interface ChatInputFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  placeholder: string;
}

export default function ChatInputForm({ value, onChange, onSubmit, isSending, placeholder }: ChatInputFormProps) {
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Message</span>
        <textarea
          rows={2}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          className={inputClass}
        />
      </label>
      <Button type="submit" disabled={isSending || !value.trim()} className="shrink-0">
        Send
      </Button>
    </form>
  );
}
