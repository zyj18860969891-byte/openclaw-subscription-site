import bcrypt from 'bcryptjs';

/**
 * Password Service
 * 用于密码的加密和验证
 */
export class PasswordService {
  private saltRounds: number = 10;

  /**
   * 加密密码
   * @param password 明文密码
   * @returns Promise<hashed password>
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * 验证密码
   * @param plainPassword 明文密码
   * @param hashedPassword 哈希密码
   * @returns Promise<boolean> 是否匹配
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 验证密码强度
   * 要求:
   * - 最少8个字符
   * - 至少包含1个大写字母
   * - 至少包含1个小写字母
   * - 至少包含1个数字
   * - 至少包含1个特殊字符 (!@#$%^&*)
   * @param password 要验证的密码
   * @returns Object with validation result and message
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    message: string;
  } {
    if (password.length < 8) {
      return {
        isValid: false,
        message: '密码至少需要8个字符',
      };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase) {
      return {
        isValid: false,
        message: '密码必须包含至少一个大写字母',
      };
    }

    if (!hasLowerCase) {
      return {
        isValid: false,
        message: '密码必须包含至少一个小写字母',
      };
    }

    if (!hasNumbers) {
      return {
        isValid: false,
        message: '密码必须包含至少一个数字',
      };
    }

    if (!hasSpecialChar) {
      return {
        isValid: false,
        message: '密码必须包含至少一个特殊字符 (!@#$%^&*等)',
      };
    }

    return {
      isValid: true,
      message: '密码强度符合要求',
    };
  }
}

// 导出单例
export const passwordService = new PasswordService();
