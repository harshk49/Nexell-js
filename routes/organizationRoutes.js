const express = require("express");
const router = express.Router();
const organizationController = require("../controllers/organizationController");
const membershipController = require("../controllers/membershipController");
const invitationController = require("../controllers/invitationController");
const { auth } = require("../middleware/auth");
const { checkRole, checkPermission } = require("../middleware/permissions");

// Organization routes
router.post("/", auth, organizationController.createOrganization);
router.get("/", auth, organizationController.getUserOrganizations);
router.get(
  "/:organizationId",
  auth,
  checkRole([]),
  organizationController.getOrganizationById
);
router.put(
  "/:organizationId",
  auth,
  checkRole(["admin"]),
  organizationController.updateOrganization
);
router.delete(
  "/:organizationId",
  auth,
  checkRole(["admin"]),
  organizationController.deleteOrganization
);

// Current organization management
router.post(
  "/:organizationId/set-current",
  auth,
  membershipController.setCurrentOrganization
);
router.post(
  "/:organizationId/leave",
  auth,
  membershipController.leaveOrganization
);

// Member management routes
router.get(
  "/:organizationId/members",
  auth,
  checkRole([]),
  membershipController.getOrganizationMembers
);
router.get(
  "/:organizationId/members/:membershipId",
  auth,
  checkRole([]),
  membershipController.getMembershipById
);
router.put(
  "/:organizationId/members/:membershipId",
  auth,
  checkRole(["admin"]),
  membershipController.updateMembership
);
router.delete(
  "/:organizationId/members/:membershipId",
  auth,
  checkRole(["admin"]),
  membershipController.removeMember
);

// Invitation routes
router.post(
  "/:organizationId/invitations",
  auth,
  checkRole(["admin", "member"]),
  invitationController.createInvitation
);
router.get(
  "/:organizationId/invitations",
  auth,
  checkRole(["admin"]),
  invitationController.getOrganizationInvitations
);
router.delete(
  "/:organizationId/invitations/:invitationId",
  auth,
  checkRole(["admin"]),
  invitationController.cancelInvitation
);
router.post(
  "/:organizationId/invitations/:invitationId/resend",
  auth,
  checkRole(["admin"]),
  invitationController.resendInvitation
);

module.exports = router;
