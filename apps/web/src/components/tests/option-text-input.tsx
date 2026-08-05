import type { JSX, KeyboardEventHandler } from "react";

import { Input } from "@/components/ui/input";
import { useBijoyPaste } from "@/hooks/use-bijoy-paste";

export interface OptionTextInputProps {
  className?: string | undefined;
  onChange: (value: string) => void;
  /** The MCQ form binds Enter to "add another option". */
  onKeyDown?: KeyboardEventHandler<HTMLInputElement> | undefined;
  placeholder?: string | undefined;
  value: string;
}

/**
 * An MCQ option's field.
 *
 * A component rather than a hook call at each site because the options are
 * rendered in a `map`, and a hook cannot be called in a loop. It exists to give
 * the plain option inputs the same Bijoy paste handling the rich text editor
 * has — a teacher pasting a question from a SutonnyMJ paper pastes its options
 * from the same paper, and having one convert and not the other is worse than
 * neither converting.
 *
 * Options carry maths as `$…$` like everything else; they are read back through
 * `MathText`.
 */
export function OptionTextInput({
  className,
  onChange,
  onKeyDown,
  placeholder,
  value
}: OptionTextInputProps): JSX.Element {
  const handlePaste = useBijoyPaste(value, onChange);

  return (
    <Input
      className={className}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      value={value}
    />
  );
}
