import { Prisma, User } from '@prisma/client';
import prisma from '../../database/prisma';
import { passwordService } from '../../utils/password';
import { ConflictError, ValidationError, NotFoundError } from '../../utils/errors';

/**
 * User Service
 * 处理所有与用户相关的数据库操作
 */
export class UserService {
  /**
   * 通过ID获取用户
   */
  async getUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * 通过邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * 创建新用户
   */
  async createUser(data: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<User> {
    console.log('🔍 [UserService] 开始创建用户:', { email: data.email, fullName: data.fullName });
    
    // 检查数据库连接状态
    try {
      await prisma.$connect();
      console.log('✅ [UserService] 数据库连接正常');
    } catch (error) {
      console.log('❌ [UserService] 数据库连接失败:', error);
      throw new Error('数据库连接失败');
    }
    
    // 检查邮箱是否已存在
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      console.log('❌ [UserService] 邮箱已被注册:', data.email);
      throw new ConflictError('该邮箱已被注册');
    }

    // 验证密码强度
    const passwordValidation = passwordService.validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      console.log('❌ [UserService] 密码强度不足:', passwordValidation.message);
      throw new ValidationError(passwordValidation.message);
    }

    // 加密密码
    const passwordHash = await passwordService.hashPassword(data.password);
    console.log('✅ [UserService] 密码加密成功');

    // 创建用户
    console.log('🔍 [UserService] 开始在数据库中创建用户...');
    try {
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
        },
      });
      
      console.log('✅ [UserService] 用户创建成功:', { id: user.id, email: user.email });
      return user;
    } catch (error) {
      console.log('❌ [UserService] 用户创建失败:', error);
      throw error;
    }
  }

  /**
   * 验证用户凭证
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    console.log('🔍 [UserService] 开始查找用户:', { email });
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      console.log('❌ [UserService] 用户不存在:', { email });
      throw new NotFoundError('用户不存在');
    }

    console.log('🔍 [UserService] 用户找到，开始验证密码:', { id: user.id, email: user.email });
    const isPasswordValid = await passwordService.verifyPassword(
      password,
      user.passwordHash
    );
    
    if (!isPasswordValid) {
      console.log('❌ [UserService] 密码不正确:', { id: user.id });
      throw new ValidationError('密码不正确');
    }

    console.log('✅ [UserService] 密码验证成功:', { id: user.id, email: user.email });
    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUser(
    id: string,
    data: Prisma.UserUpdateInput
  ): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * 修改密码
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 验证当前密码
    const isPasswordValid = await passwordService.verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new ValidationError('当前密码不正确');
    }

    // 验证新密码强度
    const passwordValidation = passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.message);
    }

    // 更新密码
    const passwordHash = await passwordService.hashPassword(newPassword);
    return await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(id: string): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    return await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

// 导出单例
export const userService = new UserService();
