const Note = require("../models/Note");
const logger = require("../utils/logger");

class NoteService {
  async createNote(noteData) {
    try {
      const note = new Note(noteData);
      await note.save();
      logger.info(`Note created with ID: ${note._id}`);
      return note;
    } catch (error) {
      logger.error(`Error creating note: ${error.message}`);
      throw error;
    }
  }

  async getNotes(userId, query) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        category,
        isPinned,
        isArchived,
        tags,
        search,
      } = query;

      const queryObj = { owner: userId };

      if (category) queryObj.category = category;
      if (isPinned !== undefined) queryObj.isPinned = isPinned === "true";
      if (isArchived !== undefined) queryObj.isArchived = isArchived === "true";
      if (tags) queryObj.tags = { $in: Array.isArray(tags) ? tags : [tags] };

      if (search) {
        queryObj.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const notes = await Note.find(queryObj)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select(
          "title content createdAt updatedAt isPinned isArchived category tags color"
        )
        .lean();

      const total = await Note.countDocuments(queryObj);

      return {
        notes,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching notes: ${error.message}`);
      throw error;
    }
  }

  async getNoteById(noteId, userId) {
    try {
      const note = await Note.findOne({
        _id: noteId,
        owner: userId,
      });

      if (!note) {
        throw new Error("Note not found");
      }

      return note;
    } catch (error) {
      logger.error(`Error fetching note: ${error.message}`);
      throw error;
    }
  }

  async updateNote(noteId, userId, updateData) {
    try {
      const note = await Note.findOneAndUpdate(
        { _id: noteId, owner: userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!note) {
        throw new Error("Note not found");
      }

      logger.info(`Note updated with ID: ${noteId}`);
      return note;
    } catch (error) {
      logger.error(`Error updating note: ${error.message}`);
      throw error;
    }
  }

  async deleteNote(noteId, userId) {
    try {
      const note = await Note.findOneAndDelete({
        _id: noteId,
        owner: userId,
      });

      if (!note) {
        throw new Error("Note not found");
      }

      logger.info(`Note deleted with ID: ${noteId}`);
      return note;
    } catch (error) {
      logger.error(`Error deleting note: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new NoteService();
