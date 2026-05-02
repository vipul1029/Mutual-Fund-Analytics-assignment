export function percentile(sortedValues, p) {
  if (!sortedValues.length) {
    return null;
  }
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }
  const rank = (p / 100) * (sortedValues.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const weight = rank - low;
  return sortedValues[low] * (1 - weight) + sortedValues[high] * weight;
}

export function median(sortedValues) {
  return percentile(sortedValues, 50);
}

export function summarize(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: median(sorted),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75)
  };
}
