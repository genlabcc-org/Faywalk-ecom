/**
 * Utility functions for resolving hex color codes to human-readable names.
 */

export const COLOR_SWATCH_NAMES = {
  "#EF4444": "Red",
  "#9B111E": "Ruby Red",
  "#E75480": "Pink",
  "#FFC0CB": "Baby Pink",
  "#734F96": "Lavender",
  "#8B2FC9": "Purple",
  "#87CEEB": "Sky Blue",
  "#4169E1": "Royal Blue",
  "#040273": "Deep Blue",
  "#429E9D": "Mint Blue",
  "#05C3DD": "Aqua Blue",
  "#008000": "Green",
  "#50C878": "Emerald Green",
  "#98FF98": "Mint Green",
  "#FFFF00": "Yellow",
  "#FFA500": "Orange",
  "#111827": "Black",
  "#000000": "Black",
  "#FFFFFF": "White",
  "#000080": "Navy Blue",
  "#0000FF": "Blue",
  "#800000": "Maroon",
  "#2563EB": "Blue",
  "#9CA3AF": "Gray",
  "#2DD4BF": "Teal",

  // Extended standard shades
  "#DC2626": "Red",
  "#B91C1C": "Dark Red",
  "#991B1B": "Maroon",
  "#F87171": "Light Red",
  "#FCA5A5": "Light Pink",
  "#EC4899": "Pink",
  "#DB2777": "Deep Pink",
  "#F43F5E": "Rose",
  "#E11D48": "Rose Red",
  "#8B5CF6": "Purple",
  "#7C3AED": "Violet",
  "#6366F1": "Indigo",
  "#4F46E5": "Indigo",
  "#3B82F6": "Blue",
  "#2563EB": "Royal Blue",
  "#1D4ED8": "Dark Blue",
  "#0EA5E9": "Sky Blue",
  "#0284C7": "Ocean Blue",
  "#06B6D4": "Cyan",
  "#0891B2": "Dark Cyan",
  "#14B8A6": "Teal",
  "#0D9488": "Dark Teal",
  "#10B981": "Emerald",
  "#059669": "Dark Emerald",
  "#22C55E": "Green",
  "#16A34A": "Forest Green",
  "#84CC16": "Lime",
  "#65A30D": "Dark Lime",
  "#EAB308": "Yellow",
  "#CA8A04": "Dark Yellow",
  "#F59E0B": "Amber",
  "#D97706": "Amber",
  "#F97316": "Orange",
  "#EA580C": "Dark Orange",
  "#78350F": "Brown",
  "#92400E": "Bronze",
  "#FFD700": "Gold",
  "#C0C0C0": "Silver",
  "#B76E79": "Rose Gold",
  "#E5E7EB": "Light Gray",
  "#D1D5DB": "Silver Gray",
  "#6B7280": "Gray",
  "#4B5563": "Charcoal",
  "#374151": "Dark Gray",
  "#1F2937": "Charcoal Black",
};

const ANCHOR_COLORS = [
  { name: "Black", r: 0, g: 0, b: 0 },
  { name: "White", r: 255, g: 255, b: 255 },
  { name: "Gray", r: 128, g: 128, b: 128 },
  { name: "Red", r: 239, g: 68, b: 68 },
  { name: "Ruby Red", r: 155, g: 17, b: 30 },
  { name: "Pink", r: 231, g: 84, b: 128 },
  { name: "Baby Pink", r: 255, g: 192, b: 203 },
  { name: "Purple", r: 139, g: 47, b: 201 },
  { name: "Lavender", r: 115, g: 79, b: 150 },
  { name: "Navy Blue", r: 0, g: 0, b: 128 },
  { name: "Blue", r: 0, g: 0, b: 255 },
  { name: "Maroon", r: 128, g: 0, b: 0 },
  { name: "Royal Blue", r: 65, g: 105, b: 225 },
  { name: "Sky Blue", r: 135, g: 206, b: 235 },
  { name: "Deep Blue", r: 4, g: 2, b: 115 },
  { name: "Teal", r: 45, g: 212, b: 191 },
  { name: "Aqua Blue", r: 5, g: 195, b: 221 },
  { name: "Green", r: 0, g: 128, b: 0 },
  { name: "Emerald Green", r: 80, g: 200, b: 120 },
  { name: "Mint Green", r: 152, g: 255, b: 152 },
  { name: "Yellow", r: 255, g: 255, b: 0 },
  { name: "Orange", r: 255, g: 165, b: 0 },
  { name: "Gold", r: 255, g: 215, b: 0 },
  { name: "Silver", r: 192, g: 192, b: 192 },
  { name: "Brown", r: 120, g: 53, b: 15 },
];

/**
 * Returns a readable color name for a given hex code or color string.
 * e.g. "#EF4444" -> "Red"
 * e.g. "Red" -> "Red"
 */
export function getColorName(rawColor) {
  if (!rawColor || typeof rawColor !== "string") return "";
  const trimmed = rawColor.trim();
  if (!trimmed) return "";

  // If already a named color without '#'
  if (!trimmed.startsWith("#")) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  // Normalize hex code
  let hex = trimmed.toUpperCase();
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  // Direct lookup
  if (COLOR_SWATCH_NAMES[hex]) {
    return COLOR_SWATCH_NAMES[hex];
  }

  // If valid 6-character hex, find nearest anchor color
  if (/^#[0-9A-F]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    let nearest = ANCHOR_COLORS[0];
    let minDistance = Infinity;

    for (const anchor of ANCHOR_COLORS) {
      const distance =
        Math.pow(r - anchor.r, 2) +
        Math.pow(g - anchor.g, 2) +
        Math.pow(b - anchor.b, 2);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = anchor;
      }
    }
    return nearest.name;
  }

  return trimmed;
}

export const COLOR_MAP = {
  'navy': '#001f3f',
  'navy blue': '#0A2582',
  'royal blue': '#4169E1',
  'sky blue': '#87CEEB',
  'light blue': '#add8e6',
  'deep blue': '#040273',
  'blue': '#0074D9',
  'black': '#111827',
  'white': '#FFFFFF',
  'grey': '#9CA3AF',
  'gray': '#9CA3AF',
  'dark grey': '#4B5563',
  'dark gray': '#4B5563',
  'light grey': '#D1D5DB',
  'light gray': '#D1D5DB',
  'melange': '#A0A0A0',
  'charcoal': '#374151',
  'skin': '#F3C59A',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
  'red': '#EF4444',
  'ruby red': '#9B111E',
  'maroon': '#800000',
  'wine': '#722F37',
  'pink': '#E75480',
  'baby pink': '#FFC0CB',
  'green': '#008000',
  'olive': '#808000',
  'olive green': '#556B2F',
  'mint green': '#98FF98',
  'emerald green': '#50C878',
  'teal': '#2DD4BF',
  'yellow': '#FFFF00',
  'orange': '#FFA500',
  'purple': '#8B2FC9',
  'lavender': '#734F96',
  'brown': '#8B4513'
};

export const getColorStyle = (c) => {
  if (!c) return '#9CA3AF';
  const lower = String(c).trim().toLowerCase();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  if (lower.startsWith('#') || lower.startsWith('rgb') || lower.startsWith('hsl')) return c;
  return lower;
};

