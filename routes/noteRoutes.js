const express = require("express");
const Note = require("../models/Note");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// 📌 Validation Middleware
const validateNote = (req, res, next) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({
      message: "Title and content are required",
      error: "VALIDATION_MISSING_FIELDS",
    });
  }
  if (title.length > 100) {
    return res.status(400).json({
      message: "Title must be under 100 characters",
      error: "VALIDATION_TITLE_TOO_LONG",
    });
  }
  next();
};

// 📌 CREATE Note (POST /api/notes)
router.post("/", authMiddleware, validateNote, async (req, res) => {
  try {
    const { title, content, isPinned, tags, category, color } = req.body;
    const note = new Note({
      title,
      content,
      owner: req.user.userId,
      isPinned,
      tags,
      category,
      color,
    });
    await note.save();
    res.status(201).json({
      message: "Note created successfully",
      note,
    });
  } catch (error) {
    console.error("Note creation error:", error);
    res.status(500).json({
      message: "Error creating note",
      error: "NOTE_CREATION_ERROR",
    });
  }
});

// 📌 GET All Notes for Logged-in User (GET /api/notes)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notes = await Note.find({ owner: req.user.userId }).sort({
      createdAt: -1,
    });
    res.json({
      message: "Notes retrieved successfully",
      notes,
    });
  } catch (error) {
    console.error("Note fetch error:", error);
    res.status(500).json({
      message: "Error fetching notes",
      error: "NOTE_FETCH_ERROR",
    });
  }
});

// 📌 GET a Single Note (GET /api/notes/:id)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
        error: "NOTE_NOT_FOUND",
      });
    }

    res.json({
      message: "Note retrieved successfully",
      note,
    });
  } catch (error) {
    console.error("Note fetch error:", error);
    res.status(500).json({
      message: "Error fetching note",
      error: "NOTE_FETCH_ERROR",
    });
  }
});

// 📌 UPDATE Note (PUT /api/notes/:id)
router.put("/:id", authMiddleware, validateNote, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
        error: "NOTE_NOT_FOUND",
      });
    }

    res.json({
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Note update error:", error);
    res.status(500).json({
      message: "Error updating note",
      error: "NOTE_UPDATE_ERROR",
    });
  }
});

// 📌 DELETE Note (DELETE /api/notes/:id)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
        error: "NOTE_NOT_FOUND",
      });
    }

    res.json({
      message: "Note deleted successfully",
      note,
    });
  } catch (error) {
    console.error("Note deletion error:", error);
    res.status(500).json({
      message: "Error deleting note",
      error: "NOTE_DELETION_ERROR",
    });
  }
});

module.exports = router;
