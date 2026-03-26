import { Search, X, Grid, Activity } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  error: string | undefined;
  name: string;
}

const ACADEMIC_ICONS = [
  "GraduationCap", "Book", "BookOpen", "Library", "School", "University",
  "Calculator", "Binary", "Sigma", "Pi", "Ruler", "Compass",
  "Pencil", "PenTool", "Eraser", "Shapes", "Circle", "Triangle", "Square",
  "Brain", "Lightbulb", "Atom", "Microscope", "Telescope",
  "Globe", "Map", "Clock", "Calendar", "Presentation",
  "Layers", "Layout", "Table", "List",
  "Monitor", "Laptop", "Video", "MessageSquare", "User", "Users", "Trophy", "Target"
];

export function IconPicker({ error, name }: IconPickerProps) {
  const { register, setValue, watch } = useFormContext();
  const selectedIcon = watch(name);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>;

  const filteredIcons = useMemo(() => {
    const allIconNames = Object.keys(icons).filter(
      (key) => typeof icons[key] === "function" || typeof icons[key] === "object"
    );

    if (!searchTerm) return ACADEMIC_ICONS;

    return allIconNames.filter((icon) =>
      icon.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 48);
  }, [searchTerm, icons]);

  const SelectedIconComp = icons[selectedIcon] || null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="category-icon"
          className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
        >
          Visual Identifier
        </Label>
        {selectedIcon && (
          <button
            type="button"
            onClick={() => setValue(name, "", { shouldDirty: true })}
            className="text-[0.6rem] font-bold text-red-500 uppercase tracking-tighter hover:opacity-70 transition-opacity"
          >
            Clear Icon
          </button>
        )}
      </div>

      <div className="relative group/picker">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="category-icon"
              className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body pl-12"
              placeholder="Search or type icon name..."
              {...register(name)}
              onFocus={() => setIsOpen(true)}
              autoComplete="off"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-on-surface/30 group-focus-within/picker:text-primary transition-colors">
              {SelectedIconComp ? <SelectedIconComp className="size-5" /> : <Search className="size-5" />}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "h-12 rounded-2xl px-4 border-outline-variant/30 transition-all active:scale-95",
              isOpen ? "bg-surface-container-high ring-2 ring-primary/20" : "bg-surface-container-low/50"
            )}
          >
            <Grid className="size-5" />
          </Button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-surface-container-low/95 backdrop-blur-3xl border border-outline-variant/40 rounded-4xl shadow-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="size-4" />
                </div>
                <h5 className="font-headline font-extrabold text-sm text-on-surface tracking-tight">Icon Repository</h5>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-xl bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors"
              >
                <X className="size-4 text-on-surface/40" />
              </button>
            </div>

            <div className="relative mb-6">
              <Input
                placeholder="Filter by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-xl bg-surface-container-highest/50 border-outline-variant/20 text-xs pl-10"
                autoFocus
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-on-surface/30" />
            </div>

            <div className="grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
              {filteredIcons.map((iconName) => {
                const IconComp = icons[iconName];
                if (!IconComp) return null;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      setValue(name, iconName, { shouldDirty: true, shouldValidate: true });
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    title={iconName}
                    className={cn(
                      "flex flex-col items-center justify-center aspect-square rounded-2xl border transition-all duration-300 group/icon-btn",
                      selectedIcon === iconName
                        ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                        : "bg-surface-container-high/30 border-outline-variant/10 hover:border-primary/2 text-on-surface/60 hover:text-primary"
                    )}
                  >
                    <IconComp className="size-5 group-hover/icon-btn:scale-110 transition-transform duration-300" />
                    <span className="text-[0.45rem] mt-1.5 opacity-0 group-hover/icon-btn:opacity-100 transition-opacity truncate max-w-full px-1 font-bold tracking-tighter uppercase">{iconName}</span>
                  </button>
                );
              })}
            </div>

            {filteredIcons.length === 0 && (
              <div className="py-12 text-center opacity-40 font-light italic text-xs">No matching signifiers in the repository.</div>
            )}
          </div>
        )}
      </div>

      {error ? <p className="text-xs text-red-500 font-bold uppercase tracking-widest pl-1 mt-1">{error}</p> : null}
    </div>
  );
}
