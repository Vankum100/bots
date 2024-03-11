export const formattedAreas = (areas: any[]) =>
  areas
    .sort((a, b) => a.number - b.number)
    .map(({ number, name }) => `${number}. ${name}`)
    .join('\n');

export const formattedContainers = (containers: any[]) => {
  const uniqueRangeipNames = new Map();
  containers.forEach((container) => {
    if (!uniqueRangeipNames.has(container.rangeipName)) {
      uniqueRangeipNames.set(container.rangeipName, container.rangeipNumber);
    }
  });
  return Array.from(uniqueRangeipNames.entries())
    .sort((a, b) => a[1] - b[1])
    .map(
      ([rangeipName, rangeipNumber], index) =>
        `${rangeipNumber}. ${rangeipName}`,
    )
    .join('\n');
};
