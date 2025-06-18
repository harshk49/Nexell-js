import { StatusCodes } from "http-status-codes";

import noteService from "../services/noteService.js";
import { apiResponse } from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

class NoteController {
  async createNote(req, res) {
    try {
      const note = await noteService.createNote({
        ...req.body,
        owner: req.user.userId,
        organization: req.body.organization || req.user.organization,
      });

      return apiResponse(res, {
        status: StatusCodes.CREATED,
        message: "Note created successfully",
        data: { note },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Note creation error: ${error.message}`, {
        userId: req.user.userId,
        error,
        requestId: req.requestId,
      });

      if (error.message.includes("Validation failed")) {
        return apiResponse(res, {
          status: StatusCodes.BAD_REQUEST,
          message: error.message,
          error: "VALIDATION_ERROR",
          requestId: req.requestId,
        });
      }

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error creating note",
        error: "NOTE_CREATION_ERROR",
        requestId: req.requestId,
      });
    }
  }

  async getNotes(req, res) {
    try {
      const result = await noteService.getNotes(req.user.userId, req.query);

      return apiResponse(res, {
        status: StatusCodes.OK,
        message: "Notes retrieved successfully",
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Note fetch error: ${error.message}`, {
        userId: req.user.userId,
        error,
        requestId: req.requestId,
      });

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error fetching notes",
        error: "NOTE_FETCH_ERROR",
        requestId: req.requestId,
      });
    }
  }

  async getNoteById(req, res) {
    try {
      const note = await noteService.getNoteById(
        req.params.id,
        req.user.userId
      );

      return apiResponse(res, {
        status: StatusCodes.OK,
        message: "Note retrieved successfully",
        data: { note },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Note fetch error: ${error.message}`, {
        userId: req.user.userId,
        noteId: req.params.id,
        error,
        requestId: req.requestId,
      });

      if (
        error.message === "Note not found" ||
        error.message === "Invalid note ID format"
      ) {
        return apiResponse(res, {
          status: StatusCodes.NOT_FOUND,
          message: error.message,
          error: "NOTE_NOT_FOUND",
          requestId: req.requestId,
        });
      }

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error fetching note",
        error: "NOTE_FETCH_ERROR",
        requestId: req.requestId,
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

      return apiResponse(res, {
        status: StatusCodes.OK,
        message: "Note updated successfully",
        data: { note },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Note update error: ${error.message}`, {
        userId: req.user.userId,
        noteId: req.params.id,
        error,
        requestId: req.requestId,
      });

      if (
        error.message === "Note not found" ||
        error.message === "Invalid note ID format"
      ) {
        return apiResponse(res, {
          status: StatusCodes.NOT_FOUND,
          message: error.message,
          error: "NOTE_NOT_FOUND",
          requestId: req.requestId,
        });
      }

      if (error.message.includes("You don't have permission")) {
        return apiResponse(res, {
          status: StatusCodes.FORBIDDEN,
          message: error.message,
          error: "NOTE_PERMISSION_DENIED",
          requestId: req.requestId,
        });
      }

      if (error.message.includes("Validation failed")) {
        return apiResponse(res, {
          status: StatusCodes.BAD_REQUEST,
          message: error.message,
          error: "VALIDATION_ERROR",
          requestId: req.requestId,
        });
      }

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error updating note",
        error: "NOTE_UPDATE_ERROR",
        requestId: req.requestId,
      });
    }
  }

  async deleteNote(req, res) {
    try {
      const note = await noteService.deleteNote(req.params.id, req.user.userId);

      return apiResponse(res, {
        status: StatusCodes.OK,
        message: "Note deleted successfully",
        data: { note },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Note delete error: ${error.message}`, {
        userId: req.user.userId,
        noteId: req.params.id,
        error,
        requestId: req.requestId,
      });

      if (
        error.message === "Note not found" ||
        error.message === "Invalid note ID format"
      ) {
        return apiResponse(res, {
          status: StatusCodes.NOT_FOUND,
          message: error.message,
          error: "NOTE_NOT_FOUND",
          requestId: req.requestId,
        });
      }

      if (error.message.includes("You don't have permission")) {
        return apiResponse(res, {
          status: StatusCodes.FORBIDDEN,
          message: error.message,
          error: "NOTE_PERMISSION_DENIED",
          requestId: req.requestId,
        });
      }

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error deleting note",
        error: "NOTE_DELETE_ERROR",
        requestId: req.requestId,
      });
    }
  }

  async addCollaborator(req, res) {
    try {
      const { id: noteId } = req.params;
      const { collaboratorId, role } = req.body;

      if (!collaboratorId || !role) {
        return apiResponse(res, {
          status: StatusCodes.BAD_REQUEST,
          message: "Collaborator ID and role are required",
          error: "MISSING_REQUIRED_FIELDS",
          requestId: req.requestId,
        });
      }

      const note = await noteService.addCollaborator(noteId, req.user.userId, {
        collaboratorId,
        role,
      });

      return apiResponse(res, {
        status: StatusCodes.OK,
        message: "Collaborator added successfully",
        data: { note },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Error adding collaborator: ${error.message}`, {
        userId: req.user.userId,
        noteId: req.params.id,
        error,
        requestId: req.requestId,
      });

      if (
        error.message.includes("not found") ||
        error.message.includes("Invalid ID")
      ) {
        return apiResponse(res, {
          status: StatusCodes.NOT_FOUND,
          message: error.message,
          error: "RESOURCE_NOT_FOUND",
          requestId: req.requestId,
        });
      }

      if (error.message.includes("permission")) {
        return apiResponse(res, {
          status: StatusCodes.FORBIDDEN,
          message: error.message,
          error: "PERMISSION_DENIED",
          requestId: req.requestId,
        });
      }

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error adding collaborator",
        error: "COLLABORATOR_ADD_ERROR",
        requestId: req.requestId,
      });
    }
  }

  async removeCollaborator(req, res) {
    try {
      const { id: noteId, collaboratorId } = req.params;

      if (!collaboratorId) {
        return apiResponse(res, {
          status: StatusCodes.BAD_REQUEST,
          message: "Collaborator ID is required",
          error: "MISSING_REQUIRED_FIELDS",
          requestId: req.requestId,
        });
      }

      const note = await noteService.removeCollaborator(
        noteId,
        req.user.userId,
        collaboratorId
      );

      return apiResponse(res, {
        status: StatusCodes.OK,
        message: "Collaborator removed successfully",
        data: { note },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Error removing collaborator: ${error.message}`, {
        userId: req.user.userId,
        noteId: req.params.id,
        collaboratorId: req.params.collaboratorId,
        error,
        requestId: req.requestId,
      });

      if (
        error.message.includes("not found") ||
        error.message.includes("Invalid ID")
      ) {
        return apiResponse(res, {
          status: StatusCodes.NOT_FOUND,
          message: error.message,
          error: "RESOURCE_NOT_FOUND",
          requestId: req.requestId,
        });
      }

      if (error.message.includes("permission")) {
        return apiResponse(res, {
          status: StatusCodes.FORBIDDEN,
          message: error.message,
          error: "PERMISSION_DENIED",
          requestId: req.requestId,
        });
      }

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error removing collaborator",
        error: "COLLABORATOR_REMOVE_ERROR",
        requestId: req.requestId,
      });
    }
  }

  async shareNote(req, res) {
    try {
      const { id: noteId } = req.params;
      const { userIds, isPublic } = req.body;

      if (
        (userIds === undefined || !Array.isArray(userIds)) &&
        isPublic === undefined
      ) {
        return apiResponse(res, {
          status: StatusCodes.BAD_REQUEST,
          message: "Either userIds array or isPublic boolean must be provided",
          error: "MISSING_REQUIRED_FIELDS",
          requestId: req.requestId,
        });
      }

      const note = await noteService.shareNote(noteId, req.user.userId, {
        userIds,
        isPublic,
      });

      return apiResponse(res, {
        status: StatusCodes.OK,
        message: "Note sharing updated successfully",
        data: { note },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error(`Error sharing note: ${error.message}`, {
        userId: req.user.userId,
        noteId: req.params.id,
        error,
        requestId: req.requestId,
      });

      if (
        error.message.includes("not found") ||
        error.message.includes("Invalid")
      ) {
        return apiResponse(res, {
          status: StatusCodes.NOT_FOUND,
          message: error.message,
          error: "RESOURCE_NOT_FOUND",
          requestId: req.requestId,
        });
      }

      if (error.message.includes("permission")) {
        return apiResponse(res, {
          status: StatusCodes.FORBIDDEN,
          message: error.message,
          error: "PERMISSION_DENIED",
          requestId: req.requestId,
        });
      }

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error updating note sharing",
        error: "NOTE_SHARING_ERROR",
        requestId: req.requestId,
      });
    }
  }
}

export default new NoteController();
