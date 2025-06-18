import mongoose from "mongoose";

import Note from "../models/Note.js";
import logger from "../utils/logger.js";
import { sanitizeHtml } from "../utils/sanitizers.js";

class NoteService {
  async createNote(noteData) {
    try {
      // Sanitize user-generated content
      if (noteData.content) {
        noteData.content = sanitizeHtml(noteData.content);
      }
      if (noteData.title) {
        noteData.title = noteData.title.trim();
      }

      // Validate ObjectIDs
      if (
        noteData.organization &&
        !mongoose.isValidObjectId(noteData.organization)
      ) {
        throw new Error("Invalid organization ID");
      }

      // Create and save the note
      const note = new Note(noteData);
      await note.save();

      logger.info(
        `Note created with ID: ${note._id} by user ${noteData.owner}`
      );
      return note;
    } catch (error) {
      if (error.name === "ValidationError") {
        logger.warn(`Validation error creating note: ${error.message}`);
        throw new Error(
          `Validation failed: ${Object.values(error.errors)
            .map((e) => e.message)
            .join(", ")}`
        );
      }
      logger.error(`Error creating note: ${error.message}`, {
        error,
        userId: noteData.owner,
      });
      throw error;
    }
  }

  async getNotes(userId, query = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "updatedAt",
        sortOrder = "desc",
        category,
        isPinned,
        isArchived,
        isFavorite,
        tags,
        search,
      } = query;

      // Validate query parameters
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      // Build the query object
      const queryObj = { owner: userId };

      if (category) queryObj.category = category;
      if (isPinned !== undefined) queryObj.isPinned = isPinned === "true";
      if (isArchived !== undefined) queryObj.isArchived = isArchived === "true";
      if (isFavorite !== undefined) queryObj.isFavorite = isFavorite === "true";

      // Handle tags (multiple or single)
      if (tags) {
        const tagArray = Array.isArray(tags)
          ? tags
          : tags.split(",").map((t) => t.trim());
        queryObj.tags = { $in: tagArray };
      }

      // Text search implementation
      if (search) {
        queryObj.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } },
        ];
      }

      // Validate sort field (whitelist approach)
      const allowedSortFields = [
        "title",
        "createdAt",
        "updatedAt",
        "lastEdited",
        "priority",
      ];
      const finalSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "updatedAt";

      const sort = {};
      sort[finalSortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute the query with pagination
      const notes = await Note.find(queryObj)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select(
          "title content createdAt updatedAt isPinned isArchived category tags color preview readingTimeFormatted isFavorite"
        )
        .lean();

      const total = await Note.countDocuments(queryObj);

      return {
        notes,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      };
    } catch (error) {
      logger.error(`Error fetching notes: ${error.message}`, { userId, error });
      throw new Error(`Failed to retrieve notes: ${error.message}`);
    }
  }

  async getNoteById(noteId, userId) {
    try {
      if (!mongoose.isValidObjectId(noteId)) {
        throw new Error("Invalid note ID format");
      }

      const note = await Note.findOne({
        _id: noteId,
        $or: [
          { owner: userId },
          { sharedWith: { $in: [userId] } },
          { "collaborators.user": userId },
          { isShared: true },
        ],
      });

      if (!note) {
        throw new Error("Note not found");
      }

      // Log access if it's not the owner
      if (note.owner.toString() !== userId) {
        logger.info(
          `User ${userId} accessed note ${noteId} owned by ${note.owner}`
        );
      }

      return note;
    } catch (error) {
      logger.error(`Error fetching note: ${error.message}`, {
        noteId,
        userId,
        error,
      });
      throw error;
    }
  }

  async updateNote(noteId, userId, updateData) {
    try {
      if (!mongoose.isValidObjectId(noteId)) {
        throw new Error("Invalid note ID format");
      }

      // Sanitize user input
      if (updateData.content) {
        updateData.content = sanitizeHtml(updateData.content);
      }
      if (updateData.title) {
        updateData.title = updateData.title.trim();
      }

      // Find the note first to check permissions
      const note = await Note.findOne({ _id: noteId });

      if (!note) {
        throw new Error("Note not found");
      }

      // Check if user has edit permissions
      const isOwner = note.owner.toString() === userId;
      const isCollaboratorEditor = note.collaborators.some(
        (c) =>
          c.user.toString() === userId && ["editor", "owner"].includes(c.role)
      );

      if (!isOwner && !isCollaboratorEditor) {
        throw new Error("You don't have permission to edit this note");
      }

      // Update the note
      const updatedNote = await Note.findByIdAndUpdate(
        noteId,
        {
          $set: {
            ...updateData,
            lastEdited: new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      logger.info(`Note ${noteId} updated by user ${userId}`);
      return updatedNote;
    } catch (error) {
      if (error.name === "ValidationError") {
        logger.warn(`Validation error updating note: ${error.message}`);
        throw new Error(
          `Validation failed: ${Object.values(error.errors)
            .map((e) => e.message)
            .join(", ")}`
        );
      }
      logger.error(`Error updating note: ${error.message}`, {
        noteId,
        userId,
        error,
      });
      throw error;
    }
  }

  async deleteNote(noteId, userId) {
    try {
      if (!mongoose.isValidObjectId(noteId)) {
        throw new Error("Invalid note ID format");
      }

      // Find the note first to check permissions
      const note = await Note.findOne({ _id: noteId });

      if (!note) {
        throw new Error("Note not found");
      }

      // Only owner can delete
      if (note.owner.toString() !== userId) {
        throw new Error("You don't have permission to delete this note");
      }

      // Perform the delete
      const deletedNote = await Note.findByIdAndDelete(noteId);

      if (!deletedNote) {
        throw new Error("Note not found");
      }

      logger.info(`Note ${noteId} deleted by user ${userId}`);
      return deletedNote;
    } catch (error) {
      logger.error(`Error deleting note: ${error.message}`, {
        noteId,
        userId,
        error,
      });
      throw error;
    }
  }

  async addCollaborator(noteId, userId, collaboratorData) {
    try {
      const { collaboratorId, role } = collaboratorData;

      if (
        !mongoose.isValidObjectId(noteId) ||
        !mongoose.isValidObjectId(collaboratorId)
      ) {
        throw new Error("Invalid ID format");
      }

      // Check if user is the owner
      const note = await Note.findOne({ _id: noteId, owner: userId });
      if (!note) {
        throw new Error("Note not found or you don't have permission");
      }

      // Check if collaborator already exists
      const existingCollaborator = note.collaborators.find(
        (c) => c.user.toString() === collaboratorId
      );

      if (existingCollaborator) {
        // Update existing collaborator role
        note.collaborators = note.collaborators.map((c) =>
          c.user.toString() === collaboratorId
            ? { ...c, role, joinedAt: c.joinedAt }
            : c
        );
      } else {
        // Add new collaborator
        note.collaborators.push({
          user: collaboratorId,
          role,
          joinedAt: new Date(),
        });
      }

      // Enable sharing
      note.isShared = true;
      await note.save();

      logger.info(
        `Collaborator ${collaboratorId} with role ${role} added to note ${noteId} by user ${userId}`
      );
      return note;
    } catch (error) {
      logger.error(`Error adding collaborator: ${error.message}`, {
        noteId,
        userId,
        error,
      });
      throw error;
    }
  }

  async removeCollaborator(noteId, userId, collaboratorId) {
    try {
      if (
        !mongoose.isValidObjectId(noteId) ||
        !mongoose.isValidObjectId(collaboratorId)
      ) {
        throw new Error("Invalid ID format");
      }

      // Check if user is the owner
      const note = await Note.findOne({ _id: noteId, owner: userId });
      if (!note) {
        throw new Error("Note not found or you don't have permission");
      }

      // Remove collaborator
      note.collaborators = note.collaborators.filter(
        (c) => c.user.toString() !== collaboratorId
      );

      // If no collaborators left, disable sharing unless explicitly shared with specific users
      if (note.collaborators.length === 0 && note.sharedWith.length === 0) {
        note.isShared = false;
      }

      await note.save();

      logger.info(
        `Collaborator ${collaboratorId} removed from note ${noteId} by user ${userId}`
      );
      return note;
    } catch (error) {
      logger.error(`Error removing collaborator: ${error.message}`, {
        noteId,
        userId,
        error,
      });
      throw error;
    }
  }

  async shareNote(noteId, userId, shareData) {
    try {
      const { userIds, isPublic } = shareData;

      if (!mongoose.isValidObjectId(noteId)) {
        throw new Error("Invalid note ID format");
      }

      // Validate userIds if provided
      if (userIds && Array.isArray(userIds)) {
        const invalidIds = userIds.filter(
          (id) => !mongoose.isValidObjectId(id)
        );
        if (invalidIds.length > 0) {
          throw new Error("Some user IDs are invalid");
        }
      }

      // Find note and check permissions
      const note = await Note.findOne({ _id: noteId, owner: userId });
      if (!note) {
        throw new Error("Note not found or you don't have permission");
      }

      // Update sharing settings
      if (isPublic !== undefined) {
        note.isShared = isPublic;
      }

      // Update sharedWith if userIds provided
      if (userIds && Array.isArray(userIds)) {
        // Remove duplicates and add all userIds
        const uniqueUserIds = [...new Set(userIds)];
        note.sharedWith = uniqueUserIds;
        // If sharing with specific users, make sure isShared is true
        if (uniqueUserIds.length > 0) {
          note.isShared = true;
        }
      }

      await note.save();

      logger.info(
        `Note ${noteId} sharing updated by user ${userId}. Public: ${note.isShared}, Shared with: ${note.sharedWith.join(", ")}`
      );
      return note;
    } catch (error) {
      logger.error(`Error updating note sharing: ${error.message}`, {
        noteId,
        userId,
        error,
      });
      throw error;
    }
  }
}

export default new NoteService();
