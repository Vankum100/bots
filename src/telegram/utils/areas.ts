export const formattedAreas = (areas: any[]) =>
  areas
    .sort((a, b) => a.number - b.number)
    .map(({ number, name }) => `${number}. ${name}`)
    .join('\n');

export const formattedContainers = (containers: any[]) =>
  containers
    .sort((a, b) => a.rangeipNumber - b.rangeipNumber)
    .map(({ rangeipName }, index) => `${index + 1}. ${rangeipName}`)
    .join('\n');

export const splitArrayIntoChunks = (arr, chunkSize) =>
  Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, index) =>
    arr.slice(index * chunkSize, index * chunkSize + chunkSize),
  );
