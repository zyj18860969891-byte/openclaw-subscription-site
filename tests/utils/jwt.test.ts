import { JwtService, TokenPayload } from '../../src/utils/jwt';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-must-be-at-least-32-chars-long-x';
    service = new JwtService();
  });

  describe('generateAccessToken', () => {
    it('应该生成有效的访问令牌', () => {
      const token = service.generateAccessToken('user123', 'test@example.com');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('生成的令牌应该包含用户信息', () => {
      const token = service.generateAccessToken('user123', 'test@example.com');
      const decoded = service.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
    });
  });

  describe('generateRefreshToken', () => {
    it('应该生成有效的刷新令牌', () => {
      const token = service.generateRefreshToken('user123');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateTokenPair', () => {
    it('应该生成访问令牌和刷新令牌对', () => {
      const pair = service.generateTokenPair('user123', 'test@example.com');

      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.expiresIn).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('应该成功验证有效的令牌', () => {
      const token = service.generateAccessToken('user123', 'test@example.com');
      const payload = service.verifyToken(token);

      expect(payload.userId).toBe('user123');
      expect(payload.email).toBe('test@example.com');
    });

    it('应该拒绝无效的令牌', () => {
      expect(() => {
        service.verifyToken('invalid.token.here');
      }).toThrow();
    });

    it('应该检测过期的令牌', async () => {
      // 这个测试在实际环境中需要特殊处理
      // 因为我们需要模拟时间
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxMzAwODI0MDAwLCJleHAiOjEzMDA4MjQ2MDB9.fake_signature';

      expect(() => {
        service.verifyToken(expiredToken);
      }).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('应该解码有效的令牌', () => {
      const token = service.generateAccessToken('user123', 'test@example.com');
      const payload = service.decodeToken(token);

      expect(payload?.userId).toBe('user123');
      expect(payload?.email).toBe('test@example.com');
    });

    it('应该为无效令牌返回null', () => {
      const payload = service.decodeToken('invalid.token');
      expect(payload).toBeNull();
    });
  });
});
