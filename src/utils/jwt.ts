import jwt from 'jsonwebtoken';

/**
 * JWT Token Payload interface
 */
export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Token Service
 * 用于生成、验证和刷新JWT令牌
 */
export class JwtService {
  private jwtSecret: string;
  private jwtExpiry: string;
  private jwtRefreshExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key-min-32-chars-here';
    this.jwtExpiry = process.env.JWT_EXPIRY || '7d';
    this.jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRY || '30d';

    if (this.jwtSecret.length < 32) {
      console.warn('⚠️ JWT_SECRET 长度少于32个字符，请在生产环境中使用更长的密钥');
    }
  }

  /**
   * 生成访问令牌 (Access Token)
   * @param userId 用户ID
   * @param email 用户邮箱
   * @returns JWT token string
   */
  generateAccessToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      userId,
      email,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
    } as jwt.SignOptions);
  }

  /**
   * 生成刷新令牌 (Refresh Token)
   * @param userId 用户ID
   * @returns JWT refresh token string
   */
  generateRefreshToken(userId: string): string {
    const payload = {
      userId,
      type: 'refresh',
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtRefreshExpiry,
    } as jwt.SignOptions);
  }

  /**
   * 生成访问令牌和刷新令牌对
   * @param userId 用户ID
   * @param email 用户邮箱
   * @returns Object containing access token and refresh token
   */
  generateTokenPair(userId: string, email: string) {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId),
      expiresIn: this.jwtExpiry,
    };
  }

  /**
   * 验证令牌
   * @param token JWT token string
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('令牌已过期');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('无效的令牌');
      }
      throw error;
    }
  }

  /**
   * 解码令牌（不验证签名）
   * 用于获取令牌信息而不进行验证
   * @param token JWT token string
   * @returns Decoded token payload
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

// 导出单例
export const jwtService = new JwtService();
