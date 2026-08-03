import { Search, X, Grid, Activity } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";

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
  const t = useT();

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
          className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
        >{t("cat.icon")}</Label>
        {selectedIcon && (
          <button
            type="button"
            onClick={() => setValue(name, "", { shouldDirty: true })}
            className="text-[0.6rem] font-bold text-red-500 uppercase tracking-tighter hover:opacity-70 transition-opacity"
          >{t("cat.clearIcon")}</button>
        )}
      </div>

      <div className="relative group/picker">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="category-icon"
              className="h-12 bg-panel-warm/50 border-hairline/30 font-body pl-12"
              placeholder={t("cat.iconSearch")}
              {...register(name)}
              onFocus={() => setIsOpen(true)}
              autoComplete="off"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-ink/30 group-focus-within/picker:text-ink transition-colors">
              {SelectedIconComp ? <SelectedIconComp className="size-5" /> : <Search className="size-5" />}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "h-12 rounded-2xl px-4 border-hairline/30 transition-all active:scale-95",
              isOpen ? "bg-chip-active ring-2 ring-ink/20" : "bg-panel-warm/50"
            )}
          >
            <Grid className="size-5" />
          </Button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-panel-warm/95 border border-hairline/40 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-ink/10 flex items-center justify-center text-ink">
                  <Activity className="size-4" />
                </div>
                <h5 className="font-body font-medium text-sm text-ink tracking-tight">{t("cat.iconLibrary")}</h5>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-8 bg-chip-active flex items-center justify-center hover:bg-chip-active transition-colors"
              >
                <X className="size-4 text-ink/40" />
              </button>
            </div>

            <div className="relative mb-6">
              <Input
                placeholder={t("common.filterByName")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 bg-chip-active/50 border-hairline/20 text-xs pl-10"
                autoFocus
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-ink/30" />
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
                        ? "bg-ink/10 border-ink/30 text-ink shadow-sm"
                        : "bg-chip-active/30 border-hairline/10 hover:border-ink/2 text-ink/60 hover:text-ink"
                    )}
                  >
                    <IconComp className="size-5 group-hover/icon-btn:scale-110" />
                    <span className="text-[0.45rem] mt-1.5 opacity-0 group-hover/icon-btn:opacity-100 transition-opacity truncate max-w-full px-1 font-bold tracking-tighter uppercase">{iconName}</span>
                  </button>
                );
              })}
            </div>

            {filteredIcons.length === 0 && (
              <div className="py-12 text-center opacity-40 font-light italic text-xs">{t("cat.noIcon")}</div>
            )}
          </div>
        )}
      </div>

      {error ? <p className="text-xs text-red-500 font-bold uppercase tracking-widest pl-1 mt-1">{error}</p> : null}
    </div>
  );
}
