/**
 * The spectrum, as classes.
 *
 * DESIGN.md §2 shipped one accent and a muted scale, which read as flat once
 * the app filled up with lists that all looked alike. These six hues exist to
 * tell things apart — a nav row, a category, a kind of exam — at the strength of
 * a coloured tab in a workbook: a tint behind a chip, an icon, a rule. The
 * accent still means "act on this" and is still rationed. ADR-0011.
 */
export const spectrumHues = ["ember", "teal", "indigo", "violet", "amber", "rose"] as const;

export type SpectrumHue = (typeof spectrumHues)[number];

interface SpectrumClasses {
  /** A tinted chip: faint background, hairline of the same hue, coloured text. */
  chip: string;
  /** An icon or a small mark. */
  text: string;
  /** A 2px rule, for the edge of a card. */
  rule: string;
}

const classes: Record<SpectrumHue, SpectrumClasses> = {
  amber: {
    chip: "bg-spectrum-amber/10 text-spectrum-amber border border-spectrum-amber/25",
    rule: "border-spectrum-amber/45",
    text: "text-spectrum-amber"
  },
  ember: {
    chip: "bg-spectrum-ember/10 text-spectrum-ember border border-spectrum-ember/25",
    rule: "border-spectrum-ember/45",
    text: "text-spectrum-ember"
  },
  indigo: {
    chip: "bg-spectrum-indigo/10 text-spectrum-indigo border border-spectrum-indigo/25",
    rule: "border-spectrum-indigo/45",
    text: "text-spectrum-indigo"
  },
  rose: {
    chip: "bg-spectrum-rose/10 text-spectrum-rose border border-spectrum-rose/25",
    rule: "border-spectrum-rose/45",
    text: "text-spectrum-rose"
  },
  teal: {
    chip: "bg-spectrum-teal/10 text-spectrum-teal border border-spectrum-teal/25",
    rule: "border-spectrum-teal/45",
    text: "text-spectrum-teal"
  },
  violet: {
    chip: "bg-spectrum-violet/10 text-spectrum-violet border border-spectrum-violet/25",
    rule: "border-spectrum-violet/45",
    text: "text-spectrum-violet"
  }
};

export function spectrumClasses(hue: SpectrumHue): SpectrumClasses {
  return classes[hue];
}

/**
 * A stable hue for a name — the same category is the same colour on every page
 * and after every deploy, which is the whole point of colouring it.
 */
export function hueForKey(key: string): SpectrumHue {
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100_000;
  }

  return spectrumHues[hash % spectrumHues.length]!;
}

/** A hue by position, for a fixed list like the sidebar. */
export function hueForIndex(index: number): SpectrumHue {
  return spectrumHues[index % spectrumHues.length]!;
}
