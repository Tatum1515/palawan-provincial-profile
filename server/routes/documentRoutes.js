import { Router } from "express";
import multer from "multer";
import { protect, protectAdmin } from "../middleware/auth.js";
import { deleteDocument, downloadDocument, listDocuments, reviewDocument, sendDocument, submitResponse, uploadDocument } from "../controllers/documentController.js";

const documentRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

documentRouter.get("/", protect, listDocuments);
documentRouter.post("/", protect, upload.single("file"), uploadDocument);
documentRouter.post("/send", protect, protectAdmin, upload.single("file"), sendDocument);
documentRouter.post("/:id/respond", protect, upload.single("file"), submitResponse);
documentRouter.patch("/:id/review", protect, reviewDocument);
documentRouter.get("/:id/download", protect, downloadDocument);
documentRouter.delete("/:id", protect, deleteDocument);

export default documentRouter;
