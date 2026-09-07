export const calculatePerformance = (physical, financial) => {
    const p = Number(physical), f = Number(financial);
    if (!Number.isFinite(p) || !Number.isFinite(f)) return { overallPhysical: null, overallFinancial: null, totalRating: null, rating: "NO RATING" };
    const overallPhysical = Number((p * 0.7).toFixed(2));
    const overallFinancial = Number((f * 0.3).toFixed(2));
    const totalRating = Number((overallPhysical + overallFinancial).toFixed(2));
    let rating = "NO RATING";
    if (totalRating >= 4) rating = "OUTSTANDING";
    else if (totalRating >= 3) rating = "VERY SATISFACTORY";
    else if (totalRating >= 2) rating = "SATISFACTORY";
    else if (totalRating >= 1) rating = "FAIR";
    else if (totalRating > 0) rating = "POOR";
    return { overallPhysical, overallFinancial, totalRating, rating };
};
