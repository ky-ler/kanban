import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChecklistInputProps {
  onSubmit: (title: string) => void;
  isPending?: boolean;
}

export function ChecklistInput({
  onSubmit,
  isPending = false,
}: ChecklistInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const title = value.trim();
    if (!title || isPending) {
      return;
    }
    onSubmit(title);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Add checklist item..."
        maxLength={500}
      />
      <Button type="button" onClick={handleSubmit} disabled={isPending}>
        Add
      </Button>
    </div>
  );
}
