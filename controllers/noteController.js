const noteService = require("../services/noteService");
const logger = require("../utils/logger");

class NoteController {
  async createNote(req, res) {
    try {
      const note = await noteService.createNote({
        ...req.body,
        owner: req.user.userId,
      });
      res.status(201).json({
        message: "Note created successfully",
        note,
      });
    } catch (error) {
      logger.error(`Note creation error: ${error.message}`);
      res.status(500).json({
        message: "Error creating note",
        error: "NOTE_CREATION_ERROR",
      });
    }
  }

  async getNotes(req, res) {
    try {
      const result = await noteService.getNotes(req.user.userId, req.query);
      res.json({
        message: "Notes retrieved successfully",
        ...result,
      });
    } catch (error) {
      logger.error(`Note fetch error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching notes",
        error: "NOTE_FETCH_ERROR",
      });
    }
  }

  async getNoteById(req, res) {
    try {
      const note = await noteService.getNoteById(
        req.params.id,
        req.user.userId
      );
      res.json({
        message: "Note retrieved successfully",
        note,
      });
    } catch (error) {
      if (error.message === "Note not found") {
        return res.status(404).json({
          message: "Note not found",
          error: "NOTE_NOT_FOUND",
        });
      }
      logger.error(`Note fetch error: ${error.message}`);
      res.status(500).json({
        message: "Error fetching note",
        error: "NOTE_FETCH_ERROR",
      });
    }
  }

  async updateNote(req, res) {
    try {
      const note = await noteService.updateNote(
        req.params.id,
        req.user.userId,
        req.body
      );
      res.json({
        message: "Note updated successfully",
        note,
      });
    } catch (error) {
      if (error.message === "Note not found") {
        return res.status(404).json({
          message: "Note not found",
          error: "NOTE_NOT_FOUND",
        });
      }
      logger.error(`Note update error: ${error.message}`);
      res.status(500).json({
        message: "Error updating note",
        error: "NOTE_UPDATE_ERROR",
      });
    }
  }

  async deleteNote(req, res) {
    try {
      const note = await noteService.deleteNote(req.params.id, req.user.userId);
      res.json({
        message: "Note deleted successfully",
        note,
      });
    } catch (error) {
      if (error.message === "Note not found") {
        return res.status(404).json({
          message: "Note not found",
          error: "NOTE_NOT_FOUND",
        });
      }
      logger.error(`Note deletion error: ${error.message}`);
      res.status(500).json({
        message: "Error deleting note",
        error: "NOTE_DELETION_ERROR",
      });
    }
  }
}

module.exports = new NoteController();
