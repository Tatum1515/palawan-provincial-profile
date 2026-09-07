import Document from "../models/Document.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import { OFFICES_BY_SECTOR, DEPARTMENTS } from "../constants/departments.js";

const sectorForOffice = (office) => Object.entries(OFFICES_BY_SECTOR).find(([, offices]) => offices.includes(office))?.[0] || "";

const getEmployeeContext = (session) => session.role === "ADMIN" ? null : Employee.findOne({ userID: session.id, isDeleted: { $ne: true } }).select("department firstName lastName");

const toSummary = (document) => {
  const item = document.toObject ? document.toObject() : document;
  const { content, ...summary } = item;
  return { ...summary, status: item.status || "PENDING", remark: item.remark || "", id: item._id.toString() };
};

// A user (non-admin) may act on a document if they submitted it, or if it's a
// template that was addressed either to them personally or to their office.
const canAccessAsRecipient = (document, session, employee) => {
  if (document.uploadedBy?.toString() === session.id) return true;
  if (document.kind === "TEMPLATE") {
    if (document.assignedTo && document.assignedTo.toString() === session.id) return true;
    if (document.assignedOffice && employee?.department === document.assignedOffice) return true;
  }
  return false;
};

export const listDocuments = async (req, res) => {
  try {
    let query = {};
    let employee = null;
    if (req.session.role !== "ADMIN") {
      employee = await getEmployeeContext(req.session);

      if (req.session.role === "DEPARTMENT_HEAD") {
        query = employee?.department
          ? { office: employee.department }
          : { _id: null };
      } else {
        query = {
          $or: [
            { uploadedBy: req.session.id },
            { kind: "TEMPLATE", assignedTo: req.session.id },
            ...(employee?.department ? [{ kind: "TEMPLATE", assignedOffice: employee.department }] : []),
          ],
        };
      }
    }
    const documents = await Document.find(query)
      .select("-content")
      .populate("uploadedBy reviewedBy activity.by assignedTo", "email firstName lastName")
      .sort({ createdAt: -1 });

    // For templates, attach a lightweight summary of the response submitted against them (if any),
    // so both the sender and the recipient can see where things stand without a second request.
    const templateIds = documents.filter((doc) => doc.kind === "TEMPLATE").map((doc) => doc._id);
    const responses = templateIds.length
      ? await Document.find({ parentDocument: { $in: templateIds } }).select("parentDocument status remark name createdAt").lean()
      : [];
    const responseByParent = new Map(responses.map((response) => [response.parentDocument.toString(), response]));

    const data = documents.map((doc) => {
      const summary = toSummary(doc);
      if (doc.kind === "TEMPLATE") {
        const response = responseByParent.get(doc._id.toString());
        summary.response = response ? { id: response._id.toString(), status: response.status, remark: response.remark, name: response.name, createdAt: response.createdAt } : null;
      }
      return summary;
    });
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Could not load documents" });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a file to upload" });
    const submitter = req.session.role === "ADMIN" ? null : await getEmployeeContext(req.session);
    if (req.session.role !== "ADMIN" && !submitter) return res.status(403).json({ error: "Your account is not authorized to submit documents" });
    const office = submitter?.department || req.body.office?.trim() || "";
    const tags = (req.body.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const document = await Document.create({
      name: req.body.name?.trim() || req.file.originalname,
      folder: req.body.folder?.trim() || "General",
      sector: submitter ? sectorForOffice(office) : req.body.sector?.trim() || sectorForOffice(office),
      office,
      description: req.body.description?.trim() || "",
      quarter: req.body.quarter?.trim() || "",
      year: req.body.year ? Number(req.body.year) : undefined,
      dueDate: req.body.dueDate || undefined,
      priority: ["LOW", "NORMAL", "HIGH"].includes(req.body.priority) ? req.body.priority : "NORMAL",
      tags,
      mimeType: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      content: req.file.buffer,
      uploadedBy: req.session.id,
      activity: [{ action: "Submitted", by: req.session.id }],
    });
    res.status(201).json({ data: toSummary(document) });
  } catch {
    res.status(500).json({ error: "Could not upload document" });
  }
};

// Admin sends a document format/template to a specific employee or an entire office.
// POST /api/documents/send  (ADMIN only)
export const sendDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Attach the file you want to send" });
    const { recipientType, userId, office, name, instructions, dueDate, priority } = req.body;

    let assignedTo, assignedOffice, sector = "";
    if (recipientType === "USER") {
      if (!userId) return res.status(400).json({ error: "Choose an employee to send this to" });
      const recipient = await User.findById(userId);
      if (!recipient) return res.status(404).json({ error: "Selected employee could not be found" });
      assignedTo = recipient._id;
      const recipientEmployee = await Employee.findOne({ userID: recipient._id }).select("department");
      sector = sectorForOffice(recipientEmployee?.department || "");
      assignedOffice = recipientEmployee?.department || "";
    } else {
      if (!office || !DEPARTMENTS.includes(office)) return res.status(400).json({ error: "Choose a valid office to send this to" });
      assignedOffice = office;
      sector = sectorForOffice(office);
    }

    const document = await Document.create({
      name: name?.trim() || req.file.originalname,
      folder: "Sent Format",
      sector,
      office: assignedOffice || "",
      description: instructions?.trim() || "",
      instructions: instructions?.trim() || "",
      dueDate: dueDate || undefined,
      priority: ["LOW", "NORMAL", "HIGH"].includes(priority) ? priority : "NORMAL",
      mimeType: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      content: req.file.buffer,
      uploadedBy: req.session.id,
      kind: "TEMPLATE",
      assignedTo,
      assignedOffice,
      status: "SENT",
      activity: [{ action: "Sent", note: assignedTo ? "Sent to a specific employee" : `Sent to ${assignedOffice}`, by: req.session.id }],
    });
    res.status(201).json({ data: toSummary(document) });
  } catch {
    res.status(500).json({ error: "Could not send document" });
  }
};

// Employee/office fills out the exact file they received and sends it back.
// POST /api/documents/:id/respond
export const submitResponse = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Attach your completed file" });
    const template = await Document.findById(req.params.id);
    if (!template || template.kind !== "TEMPLATE") return res.status(404).json({ error: "Sent document not found" });

    const employee = await getEmployeeContext(req.session);
    if (!canAccessAsRecipient(template, req.session, employee)) return res.status(403).json({ error: "This document was not sent to you" });
    if (template.status === "FULFILLED") return res.status(400).json({ error: "A response has already been submitted for this document" });

    const office = employee?.department || template.assignedOffice || "";
    const response = await Document.create({
      name: req.body.name?.trim() || req.file.originalname,
      folder: template.folder || "General",
      sector: sectorForOffice(office),
      office,
      description: req.body.note?.trim() || "",
      mimeType: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      content: req.file.buffer,
      uploadedBy: req.session.id,
      kind: "SUBMISSION",
      parentDocument: template._id,
      status: "PENDING",
      activity: [{ action: "Submitted", note: req.body.note?.trim() || "", by: req.session.id }],
    });

    template.status = "FULFILLED";
    template.activity.push({ action: "Response received", by: req.session.id });
    await template.save();

    res.status(201).json({ data: toSummary(response) });
  } catch {
    res.status(500).json({ error: "Could not submit your response" });
  }
};

export const reviewDocument = async (req, res) => {
  try {
    const { status, remark = "" } = req.body;
    const role = req.session.role;
    const document = await Document.findById(req.params.id);

    if (!document) return res.status(404).json({ error: "Document not found" });

    const employee = role === "ADMIN" ? null : await getEmployeeContext(req.session);

    if (role === "DEPARTMENT_HEAD") {
      if (!employee?.department || document.office !== employee.department) {
        return res.status(403).json({ error: "You can only review submissions from your assigned office." });
      }

      if (!["PENDING", "FULFILLED"].includes(document.status)) {
        return res.status(400).json({ error: "This document is not waiting for Department Head approval." });
      }

      if (!["APPROVED_BY_HEAD", "ENDED"].includes(status)) {
        return res.status(400).json({ error: "Department Head may only approve or return a document." });
      }

      if (status === "ENDED" && !remark.trim()) {
        return res.status(400).json({ error: "A return remark is required." });
      }

      document.status = status;
      document.remark = remark.trim();
      document.departmentHeadReviewedAt = new Date();
      document.departmentHeadReviewedBy = req.session.id;
      document.reviewedAt = new Date();
      document.reviewedBy = req.session.id;
      document.activity.push({
        action: status === "APPROVED_BY_HEAD" ? "Approved by Department Head" : "Returned by Department Head",
        note: remark.trim(),
        by: req.session.id,
      });

      await document.save();

      const populated = await Document.findById(document._id)
        .select("-content")
        .populate("uploadedBy reviewedBy departmentHeadReviewedBy adminValidatedBy activity.by", "email firstName lastName")
        .lean();

      return res.json({ data: toSummary(populated) });
    }

    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only the Department Head or PPDO/Admin can review a document." });
    }

    if (!["APPROVED_BY_HEAD", "RECEIVED", "ENDED"].includes(document.status)) {
      return res.status(400).json({ error: "Only a Department Head-approved document can be validated." });
    }

    if (!["VALIDATED", "ENDED", "RECEIVED"].includes(status)) {
      return res.status(400).json({ error: "Admin may only validate or return a document." });
    }

    if (status === "ENDED" && !remark.trim()) {
      return res.status(400).json({ error: "A return remark is required." });
    }

    document.status = status === "RECEIVED" ? "VALIDATED" : status;
    document.remark = remark.trim();
    document.adminValidatedAt = new Date();
    document.adminValidatedBy = req.session.id;
    document.reviewedAt = new Date();
    document.reviewedBy = req.session.id;
    document.activity.push({
      action: document.status === "VALIDATED" ? "Validated by PPDO" : "Returned by PPDO",
      note: remark.trim(),
      by: req.session.id,
    });

    await document.save();

    const populated = await Document.findById(document._id)
      .select("-content")
      .populate("uploadedBy reviewedBy departmentHeadReviewedBy adminValidatedBy activity.by", "email firstName lastName")
      .lean();

    return res.json({ data: toSummary(populated) });
  } catch (error) {
    console.error("REVIEW DOCUMENT:", error);
    return res.status(500).json({ error: "Could not update document status" });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (req.session.role !== "ADMIN") {
      const employee = await getEmployeeContext(req.session);

      if (req.session.role === "DEPARTMENT_HEAD") {
        if (!employee?.department || document.office !== employee.department) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (!canAccessAsRecipient(document, req.session, employee)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(document.name).replace(/%20/g, " ")}"`);
    res.send(document.content);
  } catch {
    res.status(500).json({ error: "Could not download document" });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (req.session.role !== "ADMIN" && document.uploadedBy.toString() !== req.session.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    await document.deleteOne();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not delete document" });
  }
};
