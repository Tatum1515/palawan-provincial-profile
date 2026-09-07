export const toFiniteNumber = (value, fallback = null) => {
    if (value === "" || value === null || value === undefined) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

export const calculateOverallPhysical = (physicalPerformance) => {
    const value = toFiniteNumber(physicalPerformance);
    return value === null ? null : Number((value * 0.70).toFixed(4));
};

export const calculateOverallFinancial = (financialPerformance) => {
    const value = toFiniteNumber(financialPerformance);
    return value === null ? null : Number((value * 0.30).toFixed(4));
};

export const calculateTotalRating = (overallPhysical, overallFinancial) => {
    if (overallPhysical === null || overallFinancial === null) return null;
    return Number((overallPhysical + overallFinancial).toFixed(4));
};

export const calculateRating = (totalRating) => {
    const value = Number(totalRating);
    if (!Number.isFinite(value)) return "NO RATING";
    if (value >= 4) return "OUTSTANDING";
    if (value >= 3) return "VERY SATISFACTORY";
    if (value >= 2) return "SATISFACTORY";
    if (value >= 1) return "FAIR";
    if (value > 0) return "POOR";
    return "NO RATING";
};

export const deriveOfficePerformance = ({ physicalPerformance, financialPerformance }) => {
    const overallPhysical = calculateOverallPhysical(physicalPerformance);
    const overallFinancial = calculateOverallFinancial(financialPerformance);
    const totalRating = calculateTotalRating(overallPhysical, overallFinancial);
    const rating = calculateRating(totalRating);
    return { overallPhysical, overallFinancial, totalRating, rating };
};

export const RATING_VALUES = [
    "OUTSTANDING",
    "VERY SATISFACTORY",
    "SATISFACTORY",
    "FAIR",
    "POOR",
    "NO RATING",
];
