import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import noteController from "../controllers/noteController.js";
import { validateRequest } from "../middleware/validation.js";

const router = express.Router();

// Validation schemas
const createNoteSchema = {
  body: {
    title: { type: "string", required: true, minLength: 1, maxLength: 100 },
    content: { type: "string", maxLength: 50000 },
    category: { type: "string", maxLength: 50 },
    tags: { type: "array", items: { type: "string", maxLength: 30 } },
    isPinned: { type: "boolean" },
    isArchived: { type: "boolean" },
    isFavorite: { type: "boolean" },
    color: { type: "string", pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" },
    organization: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
  },
};

const updateNoteSchema = {
  body: {
    title: { type: "string", minLength: 1, maxLength: 100 },
    content: { type: "string", maxLength: 50000 },
    category: { type: "string", maxLength: 50 },
    tags: { type: "array", items: { type: "string", maxLength: 30 } },
    isPinned: { type: "boolean" },
    isArchived: { type: "boolean" },
    isFavorite: { type: "boolean" },
    color: { type: "string", pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" },
  },
  params: {
    id: { type: "string", pattern: "^[0-9a-fA-F]{24}$", required: true },
  },
};

const collaboratorSchema = {
  body: {
    collaboratorId: {
      type: "string",
      pattern: "^[0-9a-fA-F]{24}$",
      required: true,
    },
    role: {
      type: "string",
      enum: ["viewer", "editor", "owner"],
      required: true,
    },
  },
  params: {
    id: { type: "string", pattern: "^[0-9a-fA-F]{24}$", required: true },
  },
};

const shareNoteSchema = {
  body: {
    userIds: {
      type: "array",
      items: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
    },
    isPublic: { type: "boolean" },
  },
  params: {
    id: { type: "string", pattern: "^[0-9a-fA-F]{24}$", required: true },
  },
};

// Routes for notes
router.post(
  "/",
  authenticateUser,
  validateRequest(createNoteSchema),
  noteController.createNote.bind(noteController)
);

router.get("/", authenticateUser, noteController.getNotes.bind(noteController));

router.get(
  "/:id",
  authenticateUser,
  noteController.getNoteById.bind(noteController)
);

router.put(
  "/:id",
  authenticateUser,
  validateRequest(updateNoteSchema),
  noteController.updateNote.bind(noteController)
);

router.delete(
  "/:id",
  authenticateUser,
  noteController.deleteNote.bind(noteController)
);

// Collaboration routes
router.post(
  "/:id/collaborators",
  authenticateUser,
  validateRequest(collaboratorSchema),
  noteController.addCollaborator.bind(noteController)
);

router.delete(
  "/:id/collaborators/:collaboratorId",
  authenticateUser,
  noteController.removeCollaborator.bind(noteController)
);

// Sharing routes
router.post(
  "/:id/share",
  authenticateUser,
  validateRequest(shareNoteSchema),
  noteController.shareNote.bind(noteController)
);

export default router;
