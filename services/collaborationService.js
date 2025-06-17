const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const User = require("../models/User");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

class CollaborationService {
  /**
   * Create a new comment
   */
  async createComment(data, userId) {
    try {
      const { content, entityType, entityId, parentComment = null } = data;

      // Validate entity exists based on type
      await this._validateEntity(entityType, entityId);

      // Create comment
      const comment = new Comment({
        content,
        author: userId,
        entityType,
        entityId,
        parentComment,
      });

      await comment.save();

      // Extract mentions from content and send notifications
      await this._processMentions(comment, userId);

      return comment;
    } catch (error) {
      logger.error(`Error creating comment: ${error.message}`);
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  /**
   * Get comment by ID
   */
  async getCommentById(commentId) {
    try {
      const comment = await Comment.findById(commentId)
        .populate("author", "name email profilePicture")
        .populate("mentions.user", "name email profilePicture");

      if (!comment) {
        throw new Error("Comment not found");
      }

      return comment;
    } catch (error) {
      logger.error(`Error getting comment: ${error.message}`);
      throw new Error(`Failed to get comment: ${error.message}`);
    }
  }

  /**
   * Get comments for an entity
   */
  async getCommentsForEntity(
    entityType,
    entityId,
    filters = {},
    pagination = {}
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = -1,
      } = pagination;
      const { onlyRoot = true } = filters;

      const query = {
        entityType,
        entityId,
      };

      if (onlyRoot) {
        query.parentComment = null;
      }

      const sortOption = {};
      sortOption[sortBy] = sortOrder;

      const skip = (page - 1) * limit;

      const comments = await Comment.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("author", "name email profilePicture")
        .populate("mentions.user", "name email profilePicture")
        .populate({
          path: "replies",
          options: { sort: { createdAt: 1 } },
          populate: {
            path: "author",
            select: "name email profilePicture",
          },
        });

      const total = await Comment.countDocuments(query);

      return {
        comments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting comments: ${error.message}`);
      throw new Error(`Failed to get comments: ${error.message}`);
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId, content, userId) {
    try {
      const comment = await Comment.findOne({
        _id: commentId,
        author: userId,
      });

      if (!comment) {
        throw new Error(
          "Comment not found or you don't have permission to update it"
        );
      }

      // Update content and mark as edited
      comment.content = content;
      comment.isEdited = true;

      // Re-process mentions in case they changed
      await comment.save();
      await this._processMentions(comment, userId);

      return comment;
    } catch (error) {
      logger.error(`Error updating comment: ${error.message}`);
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId, userId) {
    try {
      const comment = await Comment.findOne({
        _id: commentId,
        author: userId,
      });

      if (!comment) {
        throw new Error(
          "Comment not found or you don't have permission to delete it"
        );
      }

      // Soft delete
      comment.isDeleted = true;
      comment.content = "[deleted]";
      await comment.save();

      return { success: true };
    } catch (error) {
      logger.error(`Error deleting comment: ${error.message}`);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(commentId, reactionType, userId) {
    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        throw new Error("Comment not found");
      }

      // Check if user already reacted with this type
      const existingReaction = comment.reactions.find(
        (r) => r.user.toString() === userId && r.type === reactionType
      );

      if (existingReaction) {
        // Remove existing reaction (toggle)
        comment.reactions = comment.reactions.filter(
          (r) => !(r.user.toString() === userId && r.type === reactionType)
        );
      } else {
        // Add reaction
        comment.reactions.push({
          type: reactionType,
          user: userId,
          timestamp: new Date(),
        });
      }

      await comment.save();
      return comment;
    } catch (error) {
      logger.error(`Error adding reaction: ${error.message}`);
      throw new Error(`Failed to add reaction: ${error.message}`);
    }
  }

  /**
   * Get activity feed for an entity
   */
  async getActivityFeed(entityType, entityId, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;

      // Get comments for entity
      const comments = await Comment.find({
        entityType,
        entityId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((page - 1) * parseInt(limit))
        .populate("author", "name email profilePicture");

      // Format activities
      const activities = comments.map((comment) => ({
        type: "comment",
        actor: comment.author,
        action: comment.parentComment ? "replied" : "commented",
        timestamp: comment.createdAt,
        content: comment.content,
        reference: {
          id: comment._id,
          type: "Comment",
        },
      }));

      // TODO: Add other activity types like status changes, assignments, etc.

      return {
        activities: activities.sort((a, b) => b.timestamp - a.timestamp),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting activity feed: ${error.message}`);
      throw new Error(`Failed to get activity feed: ${error.message}`);
    }
  }

  /**
   * Mark comment as resolved/unresolved
   */
  async setCommentResolution(commentId, resolved, userId) {
    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        throw new Error("Comment not found");
      }

      // Check if user is the author or has permission on the entity
      // For simplicity, we're just checking if user is author here
      const isAuthor = comment.author.toString() === userId;
      if (!isAuthor) {
        throw new Error("You don't have permission to resolve this comment");
      }

      comment.isResolved = resolved;
      await comment.save();

      return comment;
    } catch (error) {
      logger.error(`Error setting comment resolution: ${error.message}`);
      throw new Error(`Failed to update comment resolution: ${error.message}`);
    }
  }

  /**
   * Create a notification
   */
  async createNotification(data) {
    try {
      const notification = new Notification(data);
      await notification.save();
      return notification;
    } catch (error) {
      logger.error(`Error creating notification: ${error.message}`);
      // Don't throw, notifications should fail gracefully
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, onlyUnread = false } = pagination;
      const query = { recipient: userId };

      if (onlyUnread) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("sender", "name email profilePicture");

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      return {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      logger.error(`Error getting notifications: ${error.message}`);
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId,
      });

      if (!notification) {
        throw new Error("Notification not found");
      }

      notification.isRead = true;
      await notification.save();

      return notification;
    } catch (error) {
      logger.error(`Error marking notification as read: ${error.message}`);
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { $set: { isRead: true } }
      );

      return {
        success: true,
        count: result.modifiedCount,
      };
    } catch (error) {
      logger.error(`Error marking all notifications as read: ${error.message}`);
      throw new Error(`Failed to update notifications: ${error.message}`);
    }
  }

  // Private helper methods
  async _validateEntity(entityType, entityId) {
    try {
      // Validate entity exists based on type
      let Entity;
      switch (entityType) {
        case "Task":
          Entity = require("../models/Task");
          break;
        case "TimeLog":
          Entity = require("../models/TimeLog");
          break;
        case "Project":
          Entity = require("../models/Project");
          break;
        case "Team":
          Entity = require("../models/Team");
          break;
        case "Note":
          Entity = require("../models/Note");
          break;
        case "Comment":
          Entity = require("../models/Comment");
          break;
        default:
          throw new Error("Invalid entity type");
      }

      const entity = await Entity.findById(entityId);
      if (!entity) {
        throw new Error(`${entityType} not found`);
      }

      return entity;
    } catch (error) {
      logger.error(`Entity validation error: ${error.message}`);
      throw new Error(`Invalid entity: ${error.message}`);
    }
  }

  async _processMentions(comment, authorId) {
    try {
      // Extract usernames from content using @username format
      const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
      const mentionMatches = [...comment.content.matchAll(mentionRegex)];
      const usernames = mentionMatches.map((match) => match[1]);

      if (usernames.length === 0) return;

      // Find users by username
      const users = await User.find({
        username: { $in: usernames },
      });

      // Add to mentions array
      const mentions = users.map((user) => ({
        user: user._id,
        notified: false,
      }));

      // Update comment with mentions
      if (mentions.length > 0) {
        comment.mentions = mentions;
        await comment.save();

        // Send notifications to mentioned users
        for (const mention of mentions) {
          if (mention.user.toString() !== authorId) {
            // Don't notify the author
            await this.createNotification({
              type: "mention",
              recipient: mention.user,
              sender: authorId,
              title: "You were mentioned in a comment",
              message: comment.content.substring(0, 100) + "...",
              entityType: "Comment",
              entityId: comment._id,
              link: `/comments/${comment._id}`,
              priority: "normal",
            });

            // Mark as notified
            comment.mentions.find(
              (m) => m.user.toString() === mention.user.toString()
            ).notified = true;
          }
        }
        await comment.save();
      }
    } catch (error) {
      logger.error(`Process mentions error: ${error.message}`);
      // Don't throw, mentions processing should fail gracefully
    }
  }
}

module.exports = new CollaborationService();
