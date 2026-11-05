/**
 * Chart palette — validated (lightness band, chroma, colour-blind separation,
 * contrast) against the light surface with the dataviz palette validator.
 * Fixed order: revenue is always ochre, gross profit always jade.
 */
export const CHART = {
  revenue: '#c17429', // brand ochre
  profit: '#0a8f6a', // deep jade
  neutral: '#715f55', // ink-500, single-series breakdowns
  grid: '#e7e5e4', // stone-200
  axis: '#8a7b72', // ink-400-ish, recessive axis text
} as const
