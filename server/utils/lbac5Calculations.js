const num = (value, fallback = 0) => {
    if (value === "" || value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const physicalPoints = (accomplishment) => {
    const value = num(accomplishment);
    if (value >= 110) return 5;
    if (value >= 100) return 4;
    if (value >= 90) return 3;
    if (value >= 80) return 2;
    return 1;
};

export const financialPoints = (absorptiveCapacity) => {
    const value = num(absorptiveCapacity);
    if (value >= 100) return 5;
    if (value >= 95) return 4;
    if (value >= 90) return 3;
    if (value >= 80) return 2;
    return 1;
};

export const calculateEvaluationRow = (row = {}) => {
    const rowType = String(row.rowType || "ITEM").toUpperCase();

    const cost = num(row.cost);
    const weight = num(row.weight);
    const targetOutput = num(row.targetOutput);
    const actualOutput = num(row.actualOutput);
    const allotmentReleased = num(row.allotmentReleased);
    const obligationsIncurred = num(row.obligationsIncurred);

    const variance = Number((actualOutput - targetOutput).toFixed(2));
    const accomplishmentPct = targetOutput > 0
        ? Number(((actualOutput / targetOutput) * 100).toFixed(2))
        : 0;
    const point = physicalPoints(accomplishmentPct);
    const physicalWeightedScore = Number((point * (weight / 100)).toFixed(4));
    const coaPct = Number(Math.min(accomplishmentPct, 100).toFixed(2));
    const financialVariance = Number((obligationsIncurred - allotmentReleased).toFixed(2));
    const absorptiveCapacityPct = allotmentReleased > 0
        ? Number(((obligationsIncurred / allotmentReleased) * 100).toFixed(2))
        : 0;
    const financialPoint = financialPoints(absorptiveCapacityPct);
    const financialWeightedScore = Number((financialPoint * (weight / 100)).toFixed(4));

    return {
        rowType,
        groupKey: String(row.groupKey ?? "").trim(),
        parentGroupKey: String(row.parentGroupKey ?? "").trim(),
        ppaCode: String(row.ppaCode ?? "").trim(),
        majorFinalOutput: String(row.majorFinalOutput ?? "").trim(),
        cost,
        weight,
        targetOutput,
        actualOutput,
        variance,
        accomplishmentPct,
        physicalPoints: point,
        physicalWeightedScore,
        coaPct,
        allotmentReleased,
        obligationsIncurred,
        financialVariance,
        absorptiveCapacityPct,
        financialPoints: financialPoint,
        financialWeightedScore,
        remarks: String(row.remarks ?? "").trim(),
    };
};

const sum = (rows, field) => Number(
    rows.reduce((total, row) => total + num(row[field]), 0).toFixed(2)
);

export const buildLbac5Hierarchy = (rows = []) => {
    const normalized = rows.map(calculateEvaluationRow);
    const main = normalized.find((row) => row.rowType === "MAIN") || null;
    const groups = normalized.filter((row) => row.rowType === "GROUP");
    const items = normalized.filter((row) => row.rowType === "ITEM");

    return {
        main,
        groups: groups.map((group) => {
            const itemRows = items
                .filter((item) => item.parentGroupKey === group.groupKey)
                .map(calculateEvaluationRow);

            const weight = sum(itemRows, "weight");
            const cost = sum(itemRows, "cost");
            const target = sum(itemRows, "targetOutput");
            const actual = sum(itemRows, "actualOutput");
            const variance = sum(itemRows, "variance");
            const allotment = sum(itemRows, "allotmentReleased");
            const obligations = sum(itemRows, "obligationsIncurred");
            const financialVariance = sum(itemRows, "financialVariance");

            const physicalWeightedScore = Number(
                itemRows
                    .reduce((total, row) => total + num(row.physicalWeightedScore), 0)
                    .toFixed(4)
            );

            const itemFinancialWeightedScore = Number(
                itemRows
                    .reduce((total, row) => total + num(row.financialWeightedScore), 0)
                    .toFixed(4)
            );

            const averageCoa = itemRows.length
                ? Number(
                    (
                        itemRows.reduce(
                            (total, row) => total + num(row.coaPct),
                            0
                        ) / itemRows.length
                    ).toFixed(2)
                )
                : 0;

            const absorptiveCapacityPct = allotment > 0
                ? Number(((obligations / allotment) * 100).toFixed(2))
                : 0;

            const groupFinancialPoint = financialPoints(
                absorptiveCapacityPct
            );

            return {
                ...group,
                weight,
                cost,
                targetOutput: target,
                actualOutput: actual,
                variance,
                allotmentReleased: allotment,
                obligationsIncurred: obligations,
                financialVariance,
                physicalWeightedScore,
                coaPct: averageCoa,
                absorptiveCapacityPct,
                financialPoints: groupFinancialPoint,
                financialWeightedScore: Number(
                    (groupFinancialPoint * (weight / 100)).toFixed(4)
                ),
                itemFinancialWeightedScore,
                items: itemRows,
            };
        }),
    };
};

export const calculateLbac5Totals = (rows = []) => {
    const items = rows
        .filter(
            (row) =>
                String(row.rowType || "ITEM").toUpperCase() === "ITEM"
        )
        .map(calculateEvaluationRow);

    const totalWeight = Number(
        items.reduce((sumValue, row) => sumValue + num(row.weight), 0).toFixed(2)
    );

    const physicalWeightedScore = Number(
        items
            .reduce(
                (sumValue, row) =>
                    sumValue + num(row.physicalWeightedScore),
                0
            )
            .toFixed(4)
    );

    const financialWeightedScore = Number(
        items
            .reduce(
                (sumValue, row) =>
                    sumValue + num(row.financialWeightedScore),
                0
            )
            .toFixed(4)
    );

    const totalWeightedScore = Number(
        (physicalWeightedScore + financialWeightedScore).toFixed(4)
    );

    const averageCoa = items.length
        ? Number(
            (
                items.reduce(
                    (sumValue, row) =>
                        sumValue + num(row.coaPct),
                    0
                ) / items.length
            ).toFixed(2)
        )
        : 0;

    return {
        totalCost: sum(items, "cost"),
        totalWeight,
        totalTargetOutput: sum(items, "targetOutput"),
        totalActualOutput: sum(items, "actualOutput"),
        totalVariance: sum(items, "variance"),
        physicalWeightedScore,
        totalAllotmentReleased: sum(items, "allotmentReleased"),
        totalObligationsIncurred: sum(items, "obligationsIncurred"),
        financialVariance: sum(items, "financialVariance"),
        financialWeightedScore,
        totalWeightedScore,
        averageCoa,
    };
};
