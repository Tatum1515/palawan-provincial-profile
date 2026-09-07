import { useEffect, useMemo, useState } from "react";
import { Calculator, Loader2, Save, X } from "lucide-react";
import { OFFICES_BY_SECTOR } from "../assets/assets.jsx";
import api from "../api/axios.js";

const QUARTERS = [
    ["Q1", "1st Quarter"],
    ["Q2", "2nd Quarter"],
    ["Q3", "3rd Quarter"],
    ["Q4", "4th Quarter"],
];

const FUND_SOURCES = [
    "General Fund",
    "Special Education Fund (SEF)",
    "Trust Fund",
    "20% Development Fund",
];

const CURRENT_YEAR = new Date().getFullYear();

const officeSector = (office) =>
    Object.entries(OFFICES_BY_SECTOR).find(
        ([, offices]) =>
            offices.includes(office)
    )?.[0] || "";

const initialForm = (
    record,
    userOffice
) => ({
    ppa: record?.ppa || "",
    office:
        record?.office ||
        userOffice ||
        "",
    sector:
        record?.sector ||
        officeSector(
            record?.office ||
                userOffice
        ) ||
        "",
    fundSource:
        record?.fundSource || "",
    quarter:
        record?.quarter || "Q1",
    year:
        record?.year || CURRENT_YEAR,
    physicalPerformance:
        record?.physicalPerformance ??
        "",
    financialPerformance:
        record?.financialPerformance ??
        "",
    totalAllotment:
        record?.totalAllotment ?? "",
    totalActualObligation:
        record?.totalActualObligation ??
        "",
    coaAccomplishment:
        record?.coaAccomplishment ??
        "",
    remarks:
        record?.remarks || "",
});

const numberOrNull = (value) => {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
};

export default function PerformanceFormModal({
    open,
    onClose,
    onSaved,
    record = null,
    userRole,
    userOffice = "",
}) {
    const [office, setOffice] =
        useState(userOffice);

    const [form, setForm] =
        useState(() =>
            initialForm(
                record,
                userOffice
            )
        );

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const editing = Boolean(
        record?.id ||
            record?._id
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        // Reset the controlled form when the modal opens or its source record changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm(
            initialForm(
                record,
                userOffice || office
            )
        );

        setError("");
    }, [
        open,
        record,
        userOffice,
        office,
    ]);

    useEffect(() => {
        if (
            userRole !== "EMPLOYEE" ||
            userOffice
        ) {
            return;
        }

        api.get(
            "/officePerformance/my-office"
        )
            .then(({ data }) => {
                const nextOffice =
                    data?.data
                        ?.office ||
                    "";

                const nextSector =
                    data?.data
                        ?.sector ||
                    officeSector(
                        nextOffice
                    );

                setOffice(
                    nextOffice
                );

                setForm(
                    (previous) => ({
                        ...previous,
                        office:
                            previous.office ||
                            nextOffice,
                        sector:
                            previous.sector ||
                            nextSector,
                    })
                );
            })
            .catch(() => {});
    }, [
        userRole,
        userOffice,
    ]);

    const computed = useMemo(() => {
        const physical =
            numberOrNull(
                form.physicalPerformance
            );

        const financial =
            numberOrNull(
                form.financialPerformance
            );

        const overallPhysical =
            physical === null
                ? null
                : Number(
                      (
                          physical *
                          0.7
                      ).toFixed(2)
                  );

        const overallFinancial =
            financial === null
                ? null
                : Number(
                      (
                          financial *
                          0.3
                      ).toFixed(2)
                  );

        const totalRating =
            overallPhysical ===
                null ||
            overallFinancial ===
                null
                ? null
                : Number(
                      (
                          overallPhysical +
                          overallFinancial
                      ).toFixed(2)
                  );

        return {
            overallPhysical,
            overallFinancial,
            totalRating,
        };
    }, [
        form.physicalPerformance,
        form.financialPerformance,
    ]);

    if (!open) {
        return null;
    }

    const update = (
        name,
        value
    ) => {
        setForm((current) => {
            const next = {
                ...current,
                [name]: value,
            };

            if (name === "office") {
                next.sector =
                    officeSector(
                        value
                    );
            }

            return next;
        });

        setError("");
    };

    const submit = async (
        event
    ) => {
        event.preventDefault();
        setError("");

        const physical =
            numberOrNull(
                form.physicalPerformance
            );

        const financial =
            numberOrNull(
                form.financialPerformance
            );

        const allotment =
            numberOrNull(
                form.totalAllotment
            ) ?? 0;

        const obligation =
            numberOrNull(
                form.totalActualObligation
            ) ?? 0;

        const coa =
            numberOrNull(
                form.coaAccomplishment
            ) ?? 0;

        if (!form.ppa.trim()) {
            return setError(
                "PPA / Program is required."
            );
        }

        if (!form.office) {
            return setError(
                "Office is required."
            );
        }

        if (!form.sector) {
            return setError(
                "Sector is required."
            );
        }

        if (!form.fundSource.trim()) {
            return setError(
                "Fund Source is required."
            );
        }

        if (!form.quarter) {
            return setError(
                "Quarter is required."
            );
        }

        if (
            !form.year ||
            Number(form.year) < 2000
        ) {
            return setError(
                "Please enter a valid year."
            );
        }

        if (
            physical === null ||
            physical < 0 ||
            physical > 5
        ) {
            return setError(
                "Physical Performance must be between 0 and 5."
            );
        }

        if (
            financial === null ||
            financial < 0 ||
            financial > 5
        ) {
            return setError(
                "Financial Performance must be between 0 and 5."
            );
        }

        if (
            allotment < 0 ||
            obligation < 0
        ) {
            return setError(
                "Amounts cannot be negative."
            );
        }

        if (
            coa < 0 ||
            coa > 100
        ) {
            return setError(
                "COA Accomplishment must be between 0 and 100."
            );
        }

        try {
            setSaving(true);

            const payload = {
                ppa: form.ppa.trim(),
                office: form.office,
                sector: form.sector,
                fundSource:
                    form.fundSource.trim(),
                quarter:
                    form.quarter,
                year: Number(
                    form.year
                ),
                physicalPerformance:
                    physical,
                financialPerformance:
                    financial,
                totalAllotment:
                    allotment,
                totalActualObligation:
                    obligation,
                coaAccomplishment:
                    coa,
                remarks:
                    form.remarks.trim(),
            };

            const id =
                record?.id ||
                record?._id;

            const response = id
                ? await api.put(
                      `/officePerformance/${id}`,
                      payload
                  )
                : await api.post(
                      "/officePerformance",
                      payload
                  );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.error ||
                        "Failed to save performance."
                );
            }

            onSaved?.(
                response.data
            );

            onClose?.();
        } catch (err) {
            console.error(
                "PERFORMANCE FORM SAVE:",
                err
            );

            setError(
                err.response?.data
                    ?.error ||
                    err.message ||
                    "Failed to save performance."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="mx-auto my-4 max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                            <Calculator
                                size={22}
                            />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {editing
                                    ? "Edit Performance Submission"
                                    : "Submit Performance Data"}
                            </h2>

                            <p className="text-sm text-slate-500">
                                {editing
                                    ? "Correct the same user submission and resubmit it to the Department Head."
                                    : "Your data goes directly to the Department Head. No Admin re-encoding is required."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={22} />
                    </button>
                </div>

                <form
                    onSubmit={submit}
                    className="p-6"
                >
                    {error && (
                        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Field
                            label="PPA / Program"
                            required
                        >
                            <input
                                className="field-input"
                                value={
                                    form.ppa
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "ppa",
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="PPA / program name"
                            />
                        </Field>

                        <Field
                            label="Office"
                            required
                        >
                            <input
                                className="field-input bg-slate-50"
                                value={
                                    office ||
                                    form.office
                                }
                                readOnly
                            />
                        </Field>

                        <Field
                            label="Sector"
                            required
                        >
                            <input
                                className="field-input bg-slate-50"
                                value={
                                    form.sector
                                }
                                readOnly
                            />
                        </Field>

                        <Field
                            label="Quarter"
                            required
                        >
                            <select
                                className="field-input"
                                value={
                                    form.quarter
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "quarter",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {QUARTERS.map(
                                    ([
                                        value,
                                        label,
                                    ]) => (
                                        <option
                                            key={
                                                value
                                            }
                                            value={
                                                value
                                            }
                                        >
                                            {
                                                label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>

                        <Field
                            label="Year"
                            required
                        >
                            <input
                                className="field-input"
                                type="number"
                                min="2000"
                                max="2100"
                                value={
                                    form.year
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "year",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </Field>

                        <Field
                            label="Fund Source"
                            required
                        >
                            <input
                                className="field-input"
                                list="performance-fund-sources"
                                value={
                                    form.fundSource
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "fundSource",
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="General Fund"
                            />

                            <datalist id="performance-fund-sources">
                                {FUND_SOURCES.map(
                                    (
                                        item
                                    ) => (
                                        <option
                                            key={
                                                item
                                            }
                                            value={
                                                item
                                            }
                                        />
                                    )
                                )}
                            </datalist>
                        </Field>

                        <Field
                            label="Physical (0–5)"
                            required
                        >
                            <input
                                className="field-input"
                                type="number"
                                min="0"
                                max="5"
                                step="0.01"
                                value={
                                    form.physicalPerformance
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "physicalPerformance",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </Field>

                        <Field label="Overall Physical (70%)">
                            <input
                                className="field-input bg-slate-50"
                                readOnly
                                value={
                                    computed.overallPhysical ??
                                    "—"
                                }
                            />
                        </Field>

                        <Field
                            label="Financial (0–5)"
                            required
                        >
                            <input
                                className="field-input"
                                type="number"
                                min="0"
                                max="5"
                                step="0.01"
                                value={
                                    form.financialPerformance
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "financialPerformance",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </Field>

                        <Field label="Overall Financial (30%)">
                            <input
                                className="field-input bg-slate-50"
                                readOnly
                                value={
                                    computed.overallFinancial ??
                                    "—"
                                }
                            />
                        </Field>

                        <Field label="Total Allotment (₱)">
                            <input
                                className="field-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                    form.totalAllotment
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "totalAllotment",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </Field>

                        <Field label="Actual Obligation (₱)">
                            <input
                                className="field-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                    form.totalActualObligation
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "totalActualObligation",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </Field>

                        <Field label="COA Accomplishment (%)">
                            <input
                                className="field-input"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={
                                    form.coaAccomplishment
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        "coaAccomplishment",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </Field>

                        <Field label="Total Rating">
                            <input
                                className="field-input bg-indigo-50 font-semibold text-indigo-700"
                                readOnly
                                value={
                                    computed.totalRating ??
                                    "—"
                                }
                            />
                        </Field>
                    </div>

                    <Field
                        label="Remarks"
                        className="mt-4"
                    >
                        <textarea
                            className="field-input min-h-24 resize-y"
                            value={
                                form.remarks
                            }
                            onChange={(
                                event
                            ) =>
                                update(
                                    "remarks",
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Add remarks if needed..."
                        />
                    </Field>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {saving ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}

                            {saving
                                ? "Saving..."
                                : editing
                                ? "Update & Resubmit"
                                : "Submit to Department Head"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({
    label,
    required,
    children,
    className = "",
}) {
    return (
        <div className={className}>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {label}
                {required && (
                    <span className="ml-1 text-rose-500">
                        *
                    </span>
                )}
            </label>

            {children}
        </div>
    );
}
