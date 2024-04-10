import {
  EnergyUnitEnum,
  HashRateUnitType,
  HashUnitEnum,
} from '../interfaces/enum';

export const splitArrayIntoChunks = (arr: string | any[], chunkSize: number) =>
  Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, index) =>
    arr.slice(index * chunkSize, index * chunkSize + chunkSize),
  );

export const getHashRate = (value: any, from: HashRateUnitType) => {
  const valueNumber = parseFloat(value);
  let currentValue = valueNumber;
  let currentUnit = from;

  if (currentValue === 0 && currentUnit === 'GH') {
    currentUnit = 'TH';
  } else if (currentValue < 1 && currentUnit === 'GH') {
    while (currentValue < 1 && currentUnit !== 'ZH') {
      currentValue *= 1000;
      currentUnit = Object.keys(HashUnitEnum)[
        Object.values(HashUnitEnum).indexOf(HashUnitEnum[currentUnit]) + 1
      ] as HashRateUnitType;
    }
  } else {
    while (currentValue >= 1000 && currentUnit !== 'ZH') {
      currentValue /= 1000;
      currentUnit = Object.keys(HashUnitEnum)[
        Object.values(HashUnitEnum).indexOf(HashUnitEnum[currentUnit]) - 1
      ] as HashRateUnitType;
    }
  }

  return {
    unit: `${currentUnit}/s`,
    value: currentValue.toFixed(2),
  };
};

export const getEnergyUnit = (energy: number) => {
  for (const [unit, value] of Object.entries(EnergyUnitEnum)) {
    if (Number(value) <= energy) {
      return {
        unit,
        value: String(
          (energy / Number(value)).toLocaleString('en-US', {
            maximumFractionDigits: 2,
          }),
        ),
      };
    }
  }
  return {
    unit: 'KW',
    value: String(
      (energy / 1000).toLocaleString('en-US', {
        maximumFractionDigits: 10,
      }),
    ),
  };
};
