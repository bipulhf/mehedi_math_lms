/**
 * The symbol palette, as data.
 *
 * Ported from the owner's other project. It is here rather than in the web app
 * because the same table drives two things that must not drift: the palette a
 * teacher inserts from, and `latexToPlainText`, which turns those same commands
 * back into readable characters for a plain-text context.
 *
 * `label` is what the button shows — a glyph, not prose, so it needs no
 * translation. `groupKey` is a message key; the Bangla and English group names
 * live in `@genex/i18n`, because this package carries no UI copy.
 */

export interface MathSymbol {
  /** What the button shows: `x²`, `∫`, `frac`. */
  label: string;
  /** The LaTeX inserted at the caret. */
  snippet: string;
}

export interface MathSymbolGroup {
  /** A `math.group.*` message key. */
  groupKey: string;
  symbols: readonly MathSymbol[];
}

export const mathSymbolGroups: readonly MathSymbolGroup[] = [
  {
    groupKey: "math.group.basic",
    symbols: [
      { label: "x²", snippet: "x^{2}" },
      { label: "xⁿ", snippet: "x^{n}" },
      { label: "xₙ", snippet: "x_{n}" },
      { label: "√x", snippet: "\\sqrt{x}" },
      { label: "∛x", snippet: "\\sqrt[3]{x}" },
      { label: "ⁿ√x", snippet: "\\sqrt[n]{x}" },
      { label: "a/b", snippet: "\\frac{a}{b}" },
      { label: "|x|", snippet: "|x|" }
    ]
  },
  {
    groupKey: "math.group.greekLower",
    symbols: [
      { label: "α", snippet: "\\alpha" },
      { label: "β", snippet: "\\beta" },
      { label: "γ", snippet: "\\gamma" },
      { label: "θ", snippet: "\\theta" },
      { label: "δ", snippet: "\\delta" },
      { label: "π", snippet: "\\pi" },
      { label: "μ", snippet: "\\mu" },
      { label: "σ", snippet: "\\sigma" },
      { label: "ω", snippet: "\\omega" },
      { label: "λ", snippet: "\\lambda" },
      { label: "φ", snippet: "\\phi" },
      { label: "ε", snippet: "\\epsilon" }
    ]
  },
  {
    groupKey: "math.group.greekUpper",
    symbols: [
      { label: "Γ", snippet: "\\Gamma" },
      { label: "Δ", snippet: "\\Delta" },
      { label: "Θ", snippet: "\\Theta" },
      { label: "Λ", snippet: "\\Lambda" },
      { label: "Ξ", snippet: "\\Xi" },
      { label: "Π", snippet: "\\Pi" },
      { label: "Σ", snippet: "\\Sigma" },
      { label: "Ω", snippet: "\\Omega" },
      { label: "Φ", snippet: "\\Phi" }
    ]
  },
  {
    groupKey: "math.group.operators",
    symbols: [
      { label: "±", snippet: "\\pm" },
      { label: "∓", snippet: "\\mp" },
      { label: "×", snippet: "\\times" },
      { label: "÷", snippet: "\\div" },
      { label: "·", snippet: "\\cdot" },
      { label: "≠", snippet: "\\neq" },
      { label: "≤", snippet: "\\leq" },
      { label: "≥", snippet: "\\geq" },
      { label: "≈", snippet: "\\approx" },
      { label: "≡", snippet: "\\equiv" },
      { label: "∝", snippet: "\\propto" }
    ]
  },
  {
    groupKey: "math.group.calculus",
    symbols: [
      { label: "dy/dx", snippet: "\\frac{dy}{dx}" },
      { label: "∂y/∂x", snippet: "\\frac{\\partial y}{\\partial x}" },
      { label: "∫", snippet: "\\int" },
      { label: "∬", snippet: "\\iint" },
      { label: "∮", snippet: "\\oint" },
      { label: "∫ₐᵇ", snippet: "\\int_{a}^{b}" },
      { label: "lim", snippet: "\\lim_{x \\to a}" },
      { label: "lim ∞", snippet: "\\lim_{x \\to \\infty}" },
      { label: "∑", snippet: "\\sum" },
      { label: "∑ᵢ", snippet: "\\sum_{i=1}^{n}" },
      { label: "∏", snippet: "\\prod" }
    ]
  },
  {
    groupKey: "math.group.functions",
    symbols: [
      { label: "sin", snippet: "\\sin" },
      { label: "cos", snippet: "\\cos" },
      { label: "tan", snippet: "\\tan" },
      { label: "sec", snippet: "\\sec" },
      { label: "csc", snippet: "\\csc" },
      { label: "cot", snippet: "\\cot" },
      { label: "sin⁻¹", snippet: "\\sin^{-1}" },
      { label: "cos⁻¹", snippet: "\\cos^{-1}" },
      { label: "tan⁻¹", snippet: "\\tan^{-1}" },
      { label: "ln", snippet: "\\ln" },
      { label: "log", snippet: "\\log" },
      { label: "logₐ", snippet: "\\log_{a}" },
      { label: "eˣ", snippet: "e^{x}" }
    ]
  },
  {
    groupKey: "math.group.vectors",
    symbols: [
      { label: "a⃗", snippet: "\\vec{a}" },
      { label: "î", snippet: "\\hat{i}" },
      { label: "ĵ", snippet: "\\hat{j}" },
      { label: "k̂", snippet: "\\hat{k}" },
      { label: "‖a⃗‖", snippet: "\\|\\vec{a}\\|" },
      { label: "2×2 [ ]", snippet: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}" },
      {
        label: "3×3 [ ]",
        snippet: "\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}"
      },
      { label: "2×2 | |", snippet: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}" },
      {
        label: "3×3 | |",
        snippet: "\\begin{vmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{vmatrix}"
      },
      { label: "2×2 ( )", snippet: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
      {
        label: "3×3 ( )",
        snippet: "\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}"
      },
      { label: "col", snippet: "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}" }
    ]
  },
  {
    groupKey: "math.group.equations",
    symbols: [
      {
        label: "aligned",
        snippet: "\\begin{aligned} x &= a + b \\\\ y &= c + d \\end{aligned}"
      },
      {
        label: "cases",
        snippet: "f(x) = \\begin{cases} x & \\text{if } x > 0 \\\\ 0 & \\text{otherwise} \\end{cases}"
      },
      { label: "system", snippet: "\\begin{cases} 2x + y = 5 \\\\ x - 3y = 7 \\end{cases}" }
    ]
  },
  {
    groupKey: "math.group.sets",
    symbols: [
      { label: "→", snippet: "\\rightarrow" },
      { label: "←", snippet: "\\leftarrow" },
      { label: "⇒", snippet: "\\Rightarrow" },
      { label: "⇔", snippet: "\\Leftrightarrow" },
      { label: "∴", snippet: "\\therefore" },
      { label: "∵", snippet: "\\because" },
      { label: "∈", snippet: "\\in" },
      { label: "∉", snippet: "\\notin" },
      { label: "⊂", snippet: "\\subset" },
      { label: "∪", snippet: "\\cup" },
      { label: "∩", snippet: "\\cap" },
      { label: "∅", snippet: "\\emptyset" },
      { label: "∞", snippet: "\\infty" },
      { label: "°", snippet: "^\\circ" },
      { label: "∠", snippet: "\\angle" },
      { label: "△", snippet: "\\triangle" },
      { label: "⊥", snippet: "\\perp" },
      { label: "∥", snippet: "\\parallel" },
      { label: "ℝ", snippet: "\\mathbb{R}" },
      { label: "ℕ", snippet: "\\mathbb{N}" },
      { label: "ℤ", snippet: "\\mathbb{Z}" },
      { label: "ℂ", snippet: "\\mathbb{C}" }
    ]
  }
];

/**
 * `\alpha` → `α`, for contexts that can only hold characters: a truncated list
 * row, a `title` attribute, a push notification. Derived from the palette so a
 * symbol added there is readable everywhere without a second edit.
 */
export const mathCommandCharacters: Readonly<Record<string, string>> = Object.fromEntries(
  mathSymbolGroups
    .flatMap((group) => group.symbols)
    .filter((symbol) => /^\\[a-zA-Z]+$/.test(symbol.snippet) && [...symbol.label].length === 1)
    .map((symbol) => [symbol.snippet.slice(1), symbol.label])
);
