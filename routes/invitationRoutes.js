const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitationController");
const { auth } = require("../middleware/auth");

// User invitation management (not organization-specific)
router.get("/", auth, invitationController.getUserInvitations);
router.post("/accept/:token", auth, invitationController.acceptInvitation);

module.exports = router;
