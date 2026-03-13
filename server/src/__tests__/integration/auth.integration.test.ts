import request from 'supertest';
import app from '../../app';
import mongoose from 'mongoose';
import User from '../../app/modules/user/user.model';

describe('Authentication - Integration Tests', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'ADMIN'
  };

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = new User(testUser);
      await user.save();
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should track device signature on login', async () => {
      const devicePayload = {
        deviceId: 'DEV-1234',
        deviceName: 'Windows Chrome',
        signature: 'hashsig'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          device: devicePayload
        });

      expect(response.status).toBe(200);
      
      const updatedUser = await User.findOne({ email: testUser.email });
      expect(updatedUser?.devices?.length).toBeGreaterThan(0);
      expect(updatedUser?.devices?.[0].deviceId).toBe(devicePayload.deviceId);
      expect(updatedUser?.devices?.[0].signature).toBe(devicePayload.signature);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: testUser.password
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should rate limit login attempts', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = Array(12).fill(0).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'attacker@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.success).toBe(false);
      expect(lastResponse.body.message).toContain('Too many');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get refresh token
      const user = new User(testUser);
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get access token
      const user = new User(testUser);
      const savedUser = await user.save();
      userId = savedUser._id.toString();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user._id).toBe(userId);
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      const user = new User(testUser);
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});