import { Router } from "express";
import multer from "multer";
import {
    listPhysicalReports,
    getLbac3Source,
    getPhysicalReport,
    createPhysicalReport,
    updatePhysicalReport,
    approvePhysicalReport,
    adminApprovePhysicalReport,
    reviewPhysicalReport,
    denyPhysicalReport,
    validatePhysicalReport,
    carryForwardPhysicalReport,
    deletePhysicalReport,
    downloadPhysicalSignature,
} from "../controllers/physicalReportController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 2,
    },
});

router.use(protect);

// Static routes MUST come before /:id.
router.get("/", listPhysicalReports);
router.get("/lbac3-source", getLbac3Source);
router.get("/:id/signature/:signer", downloadPhysicalSignature);
router.get("/:id", getPhysicalReport);

router.post("/", createPhysicalReport);
router.put("/:id", updatePhysicalReport);

router.patch("/:id/review", reviewPhysicalReport);

router.patch(
    "/:id/approve",
    upload.fields([
        { name: "signatureOfficeHead", maxCount: 1 },
        { name: "signatureCoordinator", maxCount: 1 },
    ]),
    approvePhysicalReport
);

router.patch("/:id/admin-approve", adminApprovePhysicalReport);
router.patch("/:id/deny", denyPhysicalReport);
router.patch("/:id/validate", validatePhysicalReport);
router.post("/:id/carry-forward", carryForwardPhysicalReport);
router.delete("/:id", deletePhysicalReport);

export default router;
