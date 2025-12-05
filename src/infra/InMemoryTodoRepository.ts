import { Todo } from "../domain/Todo";
import { ITodoRepository } from "../core/ITodoRepository";

export class InMemoryTodoRepository implements ITodoRepository {
  private todos: Todo[] = [];
  private idCounter = 0;

  async create(
    todoData: Omit<Todo, "id" | "createdAt" | "updatedAt">
  ): Promise<Todo> {
    this.idCounter += 1;
    const id = `todo-${this.idCounter}`;
    const now = new Date();

    const todo: Todo = {
      ...todoData,
      remindAt: todoData.remindAt ? new Date(todoData.remindAt) : undefined,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.todos.push(todo);
    return { ...todo };
  }

  async update(
    id: string,
    updates: Partial<Omit<Todo, "id" | "userId" | "createdAt">>
  ): Promise<Todo | null> {
    const index = this.todos.findIndex((t) => t.id === id);

    if (index === -1) {
      return null;
    }

    const previousUpdatedAt = this.todos[index].updatedAt;
    const providedUpdatedAt = updates.updatedAt ?? new Date();
    const nextUpdatedAt =
      previousUpdatedAt &&
      providedUpdatedAt.getTime() <= previousUpdatedAt.getTime()
        ? new Date(previousUpdatedAt.getTime() + 1)
        : providedUpdatedAt;

    this.todos[index] = {
      ...this.todos[index],
      ...updates,
      updatedAt: nextUpdatedAt,
    };

    return { ...this.todos[index] };
  }

  async findById(id: string): Promise<Todo | null> {
    const todo = this.todos.find((t) => t.id === id);
    return todo ? { ...todo } : null;
  }

  async findByUserId(userId: string): Promise<Todo[]> {
    return this.todos
      .filter((t) => t.userId === userId)
      .map((todo) => ({ ...todo }));
  }

  async findDueReminders(currentTime: Date): Promise<Todo[]> {
    return this.todos
      .filter(
        (t) =>
          t.status === "PENDING" &&
          t.remindAt instanceof Date &&
          t.remindAt.getTime() <= currentTime.getTime()
      )
      .map((todo) => ({ ...todo }));
  }
}
