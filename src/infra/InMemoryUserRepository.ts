import { User } from "../domain/User";
import { IUserRepository } from "../core/IUserRepository";

export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];
  private idCounter = 0;

  async create(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    this.idCounter++;
    const user: User = {
      ...userData,
      id: `user-${this.idCounter}`,
      createdAt: new Date(),
    };
    this.users.push(user);
    return { ...user };
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  async findAll(): Promise<User[]> {
    return this.users.map((user) => ({ ...user }));
  }
}
