const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Note = require('../models/Note');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Note.deleteMany({});
  await User.deleteMany({});
});

describe('Note API', () => {
  let token;
  let userId;

  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    userId = user._id;

    // Generate token
    token = jwt.sign(
      { userId: user._id },
      config.app.jwtSecret,
      { expiresIn: config.app.jwtExpiresIn }
    );
  });

  describe('POST /api/notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'Test Content',
        category: 'Test Category',
        tags: ['test', 'note']
      };

      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(noteData);

      expect(response.status).toBe(201);
      expect(response.body.note).toHaveProperty('_id');
      expect(response.body.note.title).toBe(noteData.title);
      expect(response.body.note.content).toBe(noteData.content);
      expect(response.body.note.owner).toBe(userId.toString());
    });

    it('should return 400 for invalid note data', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/notes', () => {
    beforeEach(async () => {
      // Create test notes
      await Note.create([
        {
          title: 'Note 1',
          content: 'Content 1',
          owner: userId,
          category: 'Test Category',
          tags: ['test']
        },
        {
          title: 'Note 2',
          content: 'Content 2',
          owner: userId,
          category: 'Test Category',
          tags: ['test']
        }
      ]);
    });

    it('should get all notes for the user', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter notes by category', async () => {
      const response = await request(app)
        .get('/api/notes?category=Test Category')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(2);
    });

    it('should search notes by title or content', async () => {
      const response = await request(app)
        .get('/api/notes?search=Note 1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.notes).toHaveLength(1);
    });
  });

  describe('GET /api/notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Test Note',
        content: 'Test Content',
        owner: userId
      });
      noteId = note._id;
    });

    it('should get a note by id', async () => {
      const response = await request(app)
        .get(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.note._id).toBe(noteId.toString());
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .get(`/api/notes/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Test Note',
        content: 'Test Content',
        owner: userId
      });
      noteId = note._id;
    });

    it('should update a note', async () => {
      const updateData = {
        title: 'Updated Note',
        content: 'Updated Content'
      };

      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.note.title).toBe(updateData.title);
      expect(response.body.note.content).toBe(updateData.content);
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .put(`/api/notes/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Note' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Test Note',
        content: 'Test Content',
        owner: userId
      });
      noteId = note._id;
    });

    it('should delete a note', async () => {
      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      
      // Verify note is deleted
      const deletedNote = await Note.findById(noteId);
      expect(deletedNote).toBeNull();
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .delete(`/api/notes/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
}); 