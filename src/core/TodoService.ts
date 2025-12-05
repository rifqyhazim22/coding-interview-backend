import { Todo } from "../domain/Todo";
import { ITodoRepository } from "./ITodoRepository";
import { IUserRepository } from "./IUserRepository";
import { NotFoundError, ValidationError } from "./errors";

export interface CreateTodoInput {
  userId: string;
  title: string;
  description?: string;
  remindAt?: string | Date | null;
}

export class TodoService {
  constructor(
    private todoRepo: ITodoRepository,
    private userRepo: IUserRepository
  ) {}

  async createTodo(data: CreateTodoInput): Promise<Todo> {
    const userId = data.userId;

    if (!userId) {
      throw new ValidationError("userId is required");
    }

    const trimmedTitle =
      typeof data.title === "string" ? data.title.trim() : undefined;

    if (!trimmedTitle) {
      throw new ValidationError("title must be a non-empty string");
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    const remindAt = this.parseRemindAt(data.remindAt);

    const todo = await this.todoRepo.create({
      userId,
      title: trimmedTitle,
      description: data.description,
      status: "PENDING",
      remindAt,
    });

    return todo;
  }

  async completeTodo(todoId: string): Promise<Todo> {
    if (!todoId) {
      throw new ValidationError("todoId is required");
    }

    const todo = await this.todoRepo.findById(todoId);

    if (!todo) {
      throw new NotFoundError(`Todo with id ${todoId} not found`);
    }

    if (todo.status === "DONE") {
      return todo;
    }

    const updated = await this.todoRepo.update(todoId, {
      status: "DONE",
      updatedAt: new Date(),
    });

    if (!updated) {
      // Should be unreachable because we found the todo above
      throw new NotFoundError(`Todo with id ${todoId} not found`);
    }

    return updated;
  }

  async getTodosByUser(userId: string): Promise<Todo[]> {
    return this.todoRepo.findByUserId(userId);
  }

  async processReminders(currentTime: Date = new Date()): Promise<void> {
    const dueTodos = await this.todoRepo.findDueReminders(currentTime);

    for (const todo of dueTodos) {
      if (todo.status !== "PENDING") {
        continue;
      }

      await this.todoRepo.update(todo.id, {
        status: "REMINDER_DUE",
        updatedAt: new Date(),
      });
    }
  }

  private parseRemindAt(remindAt?: string | Date | null): Date | undefined {
    if (remindAt === undefined || remindAt === null) {
      return undefined;
    }

    const parsed = remindAt instanceof Date ? remindAt : new Date(remindAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError("remindAt must be a valid date");
    }

    return parsed;
  }
}
