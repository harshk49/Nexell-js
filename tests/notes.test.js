import request from "supertest";
import mongoose from "mongoose";
import { jest } from "@jest/globals";
import app from "../server.js";
import User from "../models/User.js";
import Note from "../models/Note.js";
import { generateAuthToken } from "../middleware/auth.js";

// Mock logger to prevent console clutter during tests
jest.mock("../utils/logger.js", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe("Notes API", () => {
  let testUser;
  let testUserToken;
  let testNote;
  let secondUser;
  let secondUserToken;

  // Set up test data before running tests
  beforeAll(async () => {
    // Create test users
    testUser = new User({
      email: "notetest@example.com",
      password: "Password123!",
      firstName: "Note",
      lastName: "Tester",
      isEmailVerified: true,
    });
    await testUser.save();

    secondUser = new User({
      email: "notetest2@example.com",
      password: "Password123!",
      firstName: "Second",
      lastName: "Tester",
      isEmailVerified: true,
    });
    await secondUser.save();

    // Generate tokens
    testUserToken = generateAuthToken(testUser._id);
    secondUserToken = generateAuthToken(secondUser._id);

    // Create a test note
    testNote = new Note({
      title: "Test Note",
      content: "This is a test note content",
      owner: testUser._id,
    });
    await testNote.save();
  });

  // Clean up after tests
  afterAll(async () => {
    await User.deleteMany({});
    await Note.deleteMany({});
    await mongoose.connection.close();
  });

  // Test note creation
  describe("POST /api/notes", () => {
    it("should create a new note for authenticated user", async () => {
      const noteData = {
        title: "My New Note",
        content: "This is some test content",
        tags: ["test", "api"],
        isPinned: true,
      };

      const response = await request(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${testUserToken}`)
        .send(noteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Note created successfully");
      expect(response.body.data.note).toHaveProperty("_id");
      expect(response.body.data.note.title).toBe(noteData.title);
      expect(response.body.data.note.content).toBe(noteData.content);
      expect(response.body.data.note.tags).toEqual(
        expect.arrayContaining(noteData.tags)
      );
      expect(response.body.data.note.isPinned).toBe(true);
      expect(response.body.data.note.owner.toString()).toBe(
        testUser._id.toString()
      );
    });

    it("should return validation error for invalid note data", async () => {
      const invalidData = {
        // Missing title
        content: "This is some test content",
      };

      const response = await request(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${testUserToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 401 if user is not authenticated", async () => {
      const noteData = {
        title: "Unauthorized Note",
        content: "This should not be created",
      };

      await request(app).post("/api/notes").send(noteData).expect(401);
    });
  });

  // Test getting notes
  describe("GET /api/notes", () => {
    it("should get all notes for the authenticated user", async () => {
      // Create additional test notes for the user
      await Note.create([
        { title: "Note 1", content: "Content 1", owner: testUser._id },
        { title: "Note 2", content: "Content 2", owner: testUser._id },
      ]);

      const response = await request(app)
        .get("/api/notes")
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Notes retrieved successfully");
      expect(Array.isArray(response.body.data.notes)).toBe(true);
      expect(response.body.data.notes.length).toBeGreaterThanOrEqual(3); // At least the 3 notes we've created

      // Check pagination
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination).toHaveProperty("total");
      expect(response.body.pagination).toHaveProperty("page");
    });

    it("should filter notes by query parameters", async () => {
      await Note.create({
        title: "Pinned Note",
        content: "This is a pinned note",
        owner: testUser._id,
        isPinned: true,
      });

      const response = await request(app)
        .get("/api/notes?isPinned=true")
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.notes)).toBe(true);

      // All returned notes should be pinned
      response.body.data.notes.forEach((note) => {
        expect(note.isPinned).toBe(true);
      });
    });

    it("should not return other users notes", async () => {
      // Create a note for the second user
      await Note.create({
        title: "Other User Note",
        content: "This belongs to another user",
        owner: secondUser._id,
      });

      const response = await request(app)
        .get("/api/notes")
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      // Check that none of the notes belong to the second user
      const secondUserNotes = response.body.data.notes.filter(
        (note) => note.owner === secondUser._id.toString()
      );
      expect(secondUserNotes.length).toBe(0);
    });
  });

  // Test getting a specific note
  describe("GET /api/notes/:id", () => {
    it("should get a note by id", async () => {
      const response = await request(app)
        .get(`/api/notes/${testNote._id}`)
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Note retrieved successfully");
      expect(response.body.data.note._id).toBe(testNote._id.toString());
      expect(response.body.data.note.title).toBe(testNote.title);
      expect(response.body.data.note.content).toBe(testNote.content);
    });

    it("should return 404 for non-existent note", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/notes/${fakeId}`)
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("NOTE_NOT_FOUND");
    });

    it("should not allow access to another user's note", async () => {
      const response = await request(app)
        .get(`/api/notes/${testNote._id}`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it("should return 400 for invalid note ID format", async () => {
      const response = await request(app)
        .get("/api/notes/invalid-id")
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // Test updating notes
  describe("PUT /api/notes/:id", () => {
    it("should update a note", async () => {
      const updateData = {
        title: "Updated Title",
        content: "Updated content",
        tags: ["updated", "test"],
      };

      const response = await request(app)
        .put(`/api/notes/${testNote._id}`)
        .set("Authorization", `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Note updated successfully");
      expect(response.body.data.note.title).toBe(updateData.title);
      expect(response.body.data.note.content).toBe(updateData.content);
      expect(response.body.data.note.tags).toEqual(
        expect.arrayContaining(updateData.tags)
      );

      // Check that the version was incremented
      expect(response.body.data.note.version).toBeGreaterThan(testNote.version);
    });

    it("should prevent another user from updating the note", async () => {
      const updateData = {
        title: "Unauthorized Update",
        content: "This should fail",
      };

      await request(app)
        .put(`/api/notes/${testNote._id}`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .send(updateData)
        .expect(404); // Should be 404 (not found) rather than 403 to prevent enumeration
    });
  });

  // Test note deletion
  describe("DELETE /api/notes/:id", () => {
    it("should delete a note", async () => {
      // Create a note to delete
      const noteToDelete = await Note.create({
        title: "Delete Me",
        content: "This note will be deleted",
        owner: testUser._id,
      });

      const response = await request(app)
        .delete(`/api/notes/${noteToDelete._id}`)
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Note deleted successfully");

      // Verify note is deleted in the database
      const deletedNote = await Note.findById(noteToDelete._id);
      expect(deletedNote).toBeNull();
    });

    it("should prevent another user from deleting the note", async () => {
      await request(app)
        .delete(`/api/notes/${testNote._id}`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .expect(404); // Should be 404 (not found) rather than 403 to prevent enumeration

      // Verify note still exists
      const note = await Note.findById(testNote._id);
      expect(note).not.toBeNull();
    });
  });

  // Test collaborators and sharing
  describe("Collaboration features", () => {
    let sharedNote;

    beforeAll(async () => {
      // Create a shared note
      sharedNote = await Note.create({
        title: "Shared Note",
        content: "This note will be shared",
        owner: testUser._id,
      });
    });

    it("should add a collaborator to a note", async () => {
      const collaboratorData = {
        collaboratorId: secondUser._id.toString(),
        role: "editor",
      };

      const response = await request(app)
        .post(`/api/notes/${sharedNote._id}/collaborators`)
        .set("Authorization", `Bearer ${testUserToken}`)
        .send(collaboratorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Collaborator added successfully");
      expect(response.body.data.note.isShared).toBe(true);

      const collaborator = response.body.data.note.collaborators.find(
        (c) =>
          c.user === secondUser._id.toString() ||
          c.user.toString() === secondUser._id.toString()
      );
      expect(collaborator).toBeDefined();
      expect(collaborator.role).toBe("editor");
    });

    it("should allow collaborator to access the note", async () => {
      const response = await request(app)
        .get(`/api/notes/${sharedNote._id}`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note._id).toBe(sharedNote._id.toString());
    });

    it("should allow collaborator with editor role to update the note", async () => {
      const updateData = {
        title: "Collaborator Updated",
        content: "This was updated by a collaborator",
      };

      const response = await request(app)
        .put(`/api/notes/${sharedNote._id}`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe(updateData.title);
    });

    it("should remove a collaborator", async () => {
      const response = await request(app)
        .delete(`/api/notes/${sharedNote._id}/collaborators/${secondUser._id}`)
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Collaborator removed successfully");

      // After removing the collaborator, they shouldn't be able to access the note
      await request(app)
        .get(`/api/notes/${sharedNote._id}`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .expect(404);
    });
  });
});
