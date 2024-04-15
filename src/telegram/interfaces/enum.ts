export enum HashUnitEnum {
    ZH = '1000000000000000000000',
    EH = '1000000000000000000',
    PH = '1000000000000000',
    TH = '1000000000000',
    GH = '1000000000',
    MH = '1000000',
    KH = '1000'
}

export enum EnergyUnitEnum {
    ZW = '1000000000000000000000',
    EW = '1000000000000000000',
    PW = '1000000000000000',
    TW = '1000000000000',
    GW = '1000000000',
    MW = '1000000',
    KW = '1000',
    W = "1",
}

export type HashRateUnitType = keyof typeof HashUnitEnum
