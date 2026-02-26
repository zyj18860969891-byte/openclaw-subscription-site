import { PasswordService } from '../../src/utils/password';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('hashPassword', () => {
    it('应该成功加密密码', async () => {
      const password = 'TestPass123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('相同的密码生成不同的哈希值', async () => {
      const password = 'TestPass123!';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('应该成功验证正确的密码', async () => {
      const password = 'TestPass123!';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const password = 'TestPass123!';
      const wrongPassword = 'WrongPass123!';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('应该拒绝少于8个字符的密码', () => {
      const result = service.validatePasswordStrength('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('8');
    });

    it('应该拒绝没有大写字母的密码', () => {
      const result = service.validatePasswordStrength('testpass123!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('大写');
    });

    it('应该拒绝没有小写字母的密码', () => {
      const result = service.validatePasswordStrength('TESTPASS123!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('小写');
    });

    it('应该拒绝没有数字的密码', () => {
      const result = service.validatePasswordStrength('TestPass!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('数字');
    });

    it('应该拒绝没有特殊字符的密码', () => {
      const result = service.validatePasswordStrength('TestPass123');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('特殊字符');
    });

    it('应该接受符合条件的密码', () => {
      const result = service.validatePasswordStrength('StrongPass123!');
      expect(result.isValid).toBe(true);
    });
  });
});
