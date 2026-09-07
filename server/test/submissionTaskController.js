import SubmissionTask from "../models/SubmissionTask.js";
import PhysicalReport from "../models/PhysicalReport.js";
import Document from "../models/Document.js";
import Employee from "../models/Employee.js";
import { DEPARTMENTS } from "../constants/departments.js";

const FORM_TYPES = [
    "LBAC3",
    "LBAC5",
    "DOCUMENT",
    "GENERAL",
];

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const clean = (value) =>
    String(value ?? "").trim();

const getEmployee = async (sessionId) =>
    Employee.findOne({
        userID: sessionId,
        isDeleted: { $ne: true },
    })
        .select("department firstName lastName")
        .lean();

const validateDates = (startDate, dueDate) => {
    const startText = String(startDate ?? "").slice(0, 10);
    const dueText = String(dueDate ?? "").slice(0, 10);

    const start = new Date(`${startText}T00:00:00`);
    const due = new Date(`${dueText}T23:59:59.999`);

    if (Number.isNaN(start.getTime())) {
        return { error: "Start date is invalid." };
    }

    if (Number.isNaN(due.getTime())) {
        return { error: "Due date is invalid." };
    }

    if (due < start) {
        return {
            error: "Due date cannot be earlier than the start date.",
        };
    }

    return { start, due };
};

const getTaskState = (task, now = new Date()) => {
    const start = new Date(task.startDate);
    const due = new Date(task.dueDate);

    if (!task.active) return "CLOSED";

    if (now < start) return "UPCOMING";

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / msPerDay);

    if (daysRemaining < 0) return "OVERDUE";
    if (daysRemaining <= 7) return "DUE_SOON";

    return "OPEN";
};

const getDaysRemaining = (task, now = new Date()) =>
    Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

const findLinkedSubmission = async (task, office) => {
    if (!office) return null;

    if (["LBAC3", "LBAC5"].includes(task.formType)) {
        const physicalFilter = {
            office,
            year: task.year,
            quarter: task.quarter,
            formType: task.formType,
            submittedBy: { $exists: true },
        };

        if (task.reportGroupId) physicalFilter.reportGroupId = task.reportGroupId;
        else if (task.reportTitle) physicalFilter.reportTitle = task.reportTitle;

        return PhysicalReport.findOne(physicalFilter)
            .sort({ updatedAt: -1, createdAt: -1 })
            .select("_id status createdAt reportTitle reportGroupId")
            .lean();
    }

    if (task.formType === "DOCUMENT") {
        return Document.findOne({
            $and: [
                {
                    $or: [
                        { office },
                        { assignedOffice: office },
                    ],
                },
                { year: task.year },
                { quarter: task.quarter || "" },
                { uploadedBy: { $exists: true } },
                {
                    $or: [
                        { name: task.title },
                        { name: { $regex: task.title, $options: "i" } },
                    ],
                },
                {
                    status: {
                        $in: [
                            "PENDING",
                            "RECEIVED",
                            "FULFILLED",
                            "SENT",
                        ],
                    },
                },
            ],
        })
            .sort({ createdAt: -1 })
            .select("_id status createdAt name")
            .lean();
    }

    return null;
};

const serializeTask = async (task, office) => {
    const plain = task.toObject
        ? task.toObject()
        : task;

    const linked = await findLinkedSubmission(
        plain,
        office
    );

    const state = getTaskState(plain);

    return {
        id: plain._id.toString(),
        title: plain.title,
        description: plain.description,
        office: plain.office,
        formType: plain.formType,
        documentType: plain.documentType,
        reportTitle: plain.reportTitle || "",
        reportGroupId: plain.reportGroupId || "",
        year: plain.year,
        quarter: plain.quarter,
        startDate: plain.startDate,
        dueDate: plain.dueDate,
        active: plain.active,
        state: linked ? (
            ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(linked.status) ? "APPROVED" :
            ["RETURNED", "DENIED"].includes(linked.status) ? "RETURNED" : "SUBMITTED"
        ) : state,
        daysRemaining: getDaysRemaining(plain),
        submitted: Boolean(linked),
        linkedSubmission: linked
            ? {
                  id: linked._id.toString(),
                  status: linked.status,
                  createdAt: linked.createdAt,
                  name: linked.name || "",
              }
            : null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};

export const listSubmissionTasks = async (req, res) => {
    try {
        const year = req.query.year
            ? Number(req.query.year)
            : null;

        const filter = {};

        if (Number.isInteger(year)) {
            filter.year = year;
        }

        let office = "";

        if (req.session.role === "ADMIN") {
            if (req.query.office) {
                filter.office = clean(req.query.office);
            }
            office = clean(req.query.office);
        } else {
            const employee = await getEmployee(req.session.id);

            if (!employee?.department) {
                return res.json({
                    success: true,
                    data: [],
                });
            }

            office = employee.department;

            filter.$or = [
                { office },
                { office: "ALL" },
            ];
        }

        if (req.query.formType && FORM_TYPES.includes(req.query.formType)) {
            filter.formType = req.query.formType;
        }

        if (
            req.query.quarter &&
            QUARTERS.includes(req.query.quarter)
        ) {
            filter.quarter = req.query.quarter;
        }

        const tasks = await SubmissionTask.find(filter)
            .sort({ startDate: 1, dueDate: 1, createdAt: -1 })
            .lean();

        const data = await Promise.all(
            tasks.map((task) =>
                serializeTask(task, office)
            )
        );

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("LIST SUBMISSION TASKS:", error);
        res.status(500).json({
            success: false,
            error: "Unable to load submission tasks.",
        });
    }
};

export const createSubmissionTask = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "Admin access required.",
            });
        }

        const title = clean(req.body.title);
        const description = clean(req.body.description);
        const office = clean(req.body.office) || "ALL";
        const formType = clean(req.body.formType) || "GENERAL";
        const documentType = clean(req.body.documentType);
        const reportTitle = clean(req.body.reportTitle);
        const reportGroupId = clean(req.body.reportGroupId);
        const year = Number(req.body.year);
        const quarter = clean(req.body.quarter);
        const startDate = req.body.startDate;
        const dueDate = req.body.dueDate;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: "Task/document title is required.",
            });
        }

        if (!FORM_TYPES.includes(formType)) {
            return res.status(400).json({
                success: false,
                error: "Invalid task type.",
            });
        }

        if (
            office !== "ALL" &&
            !DEPARTMENTS.includes(office)
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid office.",
            });
        }

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: "Invalid year.",
            });
        }

        if (quarter && !QUARTERS.includes(quarter)) {
            return res.status(400).json({
                success: false,
                error: "Invalid quarter.",
            });
        }

        if (["LBAC3", "LBAC5"].includes(formType) && !QUARTERS.includes(quarter)) {
            return res.status(400).json({
                success: false,
                error: `${formType} deadlines must have a quarter.`,
            });
        }

        const dates = validateDates(
            startDate,
            dueDate
        );

        if (dates.error) {
            return res.status(400).json({
                success: false,
                error: dates.error,
            });
        }

        const task = await SubmissionTask.create({
            title,
            description,
            office,
            formType,
            documentType,
            reportTitle,
            reportGroupId,
            year,
            quarter,
            startDate: dates.start,
            dueDate: dates.due,
            active: true,
            createdBy: req.session.id,
        });

        res.status(201).json({
            success: true,
            message: "Submission task scheduled successfully.",
            data: await serializeTask(task, office),
        });
    } catch (error) {
        console.error("CREATE SUBMISSION TASK:", error);
        res.status(500).json({
            success: false,
            error: "Unable to create submission task.",
        });
    }
};

export const updateSubmissionTask = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "Admin access required.",
            });
        }

        const task = await SubmissionTask.findById(
            req.params.id
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found.",
            });
        }

        const updates = {};

        if (req.body.title !== undefined) {
            const title = clean(req.body.title);
            if (!title) {
                return res.status(400).json({
                    success: false,
                    error: "Task title is required.",
                });
            }
            updates.title = title;
        }

        if (req.body.description !== undefined) {
            updates.description = clean(
                req.body.description
            );
        }

        if (req.body.reportTitle !== undefined) {
            updates.reportTitle = clean(req.body.reportTitle);
        }

        if (req.body.reportGroupId !== undefined) {
            updates.reportGroupId = clean(req.body.reportGroupId);
        }

        if (req.body.office !== undefined) {
            const office = clean(req.body.office) || "ALL";
            if (
                office !== "ALL" &&
                !DEPARTMENTS.includes(office)
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid office.",
                });
            }
            updates.office = office;
        }

        if (req.body.startDate !== undefined || req.body.dueDate !== undefined) {
            const startDate =
                req.body.startDate !== undefined
                    ? req.body.startDate
                    : task.startDate;
            const dueDate =
                req.body.dueDate !== undefined
                    ? req.body.dueDate
                    : task.dueDate;

            const dates = validateDates(
                startDate,
                dueDate
            );

            if (dates.error) {
                return res.status(400).json({
                    success: false,
                    error: dates.error,
                });
            }

            updates.startDate = dates.start;
            updates.dueDate = dates.due;
        }

        if (req.body.active !== undefined) {
            updates.active = Boolean(req.body.active);
        }

        const updated = await SubmissionTask.findByIdAndUpdate(
            task._id,
            updates,
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        res.json({
            success: true,
            message: "Submission task updated.",
            data: await serializeTask(
                updated,
                updated.office === "ALL" ? "" : updated.office
            ),
        });
    } catch (error) {
        console.error("UPDATE SUBMISSION TASK:", error);
        res.status(500).json({
            success: false,
            error: "Unable to update submission task.",
        });
    }
};

export const deleteSubmissionTask = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "Admin access required.",
            });
        }

        const task = await SubmissionTask.findByIdAndDelete(
            req.params.id
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found.",
            });
        }

        res.json({
            success: true,
            message: "Submission task removed.",
        });
    } catch (error) {
        console.error("DELETE SUBMISSION TASK:", error);
        res.status(500).json({
            success: false,
            error: "Unable to delete submission task.",
        });
    }
};