export const formattedAreas = (areas: any[]) =>
  areas
    .sort((a, b) => a.number - b.number)
    .map(({ number, name }) => `${number}. ${name}`)
    .join('\n');
