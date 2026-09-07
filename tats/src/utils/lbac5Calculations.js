const num = (value, fallback = 0) => {
    if (value === "" || value === null || value === undefined) {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const physicalPoints = (accomplishmentPct) => {
    const value = num(accomplishmentPct);

    if (value >= 110) return 5;
    if (value >= 100) return 4;
    if (value >= 90) return 3;
    if (value >= 80) return 2;

    return 1;
};

export const financialPoints = (absorptiveCapacityPct) => {
    const value = num(absorptiveCapacityPct);

    if (value >= 96) return 5;
    if (value >= 91) return 4;
    if (value >= 86) return 3;
    if (value >= 81) return 2;

    return 1;
};

export const calculateLbac5Row = (row = {}) => {
    const weight = Math.max(
        0,
        Math.min(100, num(row.weight))
    );

    const target = Math.max(
        0,
        num(row.targetOutput)
    );

    const actual = Math.max(
        0,
        num(row.actualOutput)
    );

    const allotment = Math.max(
        0,
        num(row.allotmentReleased)
    );

    const obligations = Math.max(
        0,
        num(row.obligationsIncurred)
    );

    const variance = actual - target;

    const accomplishment =
        target > 0
            ? (actual / target) * 100
            : 0;

    const coa = Math.min(
        accomplishment,
        100
    );

    const physical = physicalPoints(
        accomplishment
    );

    const physicalWeighted =
        physical * (weight / 100);

    const financialVariance =
        obligations - allotment;

    const absorptive =
        allotment > 0
            ? (obligations / allotment) * 100
            : 0;

    const financial = financialPoints(
        absorptive
    );

    const financialWeighted =
        financial * (weight / 100);

    return {
        ...row,

        weight,
        target,
        actual,
        allotment,
        obligations,

        variance,
        accomplishment,
        coa,

        physical,
        physicalWeighted,

        financialVariance,
        absorptive,

        financial,
        financialWeighted,
    };
};