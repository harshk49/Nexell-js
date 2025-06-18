import express from "express";

import invitationController from "../controllers/invitationController.js";
import { authenticateUser as auth } from "../middleware/auth.js";

const router = express.Router();

// User invitation management (not organization-specific)
router.get("/", auth, invitationController.getUserInvitations);
router.post("/accept/:token", auth, invitationController.acceptInvitation);

export default router;
