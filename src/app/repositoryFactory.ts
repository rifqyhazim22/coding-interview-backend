import { ITodoRepository } from "../core/ITodoRepository";
import { IUserRepository } from "../core/IUserRepository";
import { InMemoryTodoRepository } from "../infra/InMemoryTodoRepository";
import { InMemoryUserRepository } from "../infra/InMemoryUserRepository";

export interface RepositoryBundle {
  todoRepo: ITodoRepository;
  userRepo: IUserRepository;
}

/**
 * Simple factory to allow swapping repository implementations (e.g., memory vs DB).
 * Extend `kind` handling to add DB-backed repositories without touching app wiring.
 */
export function createRepositories(kind: string | undefined): RepositoryBundle {
  switch ((kind ?? "memory").toLowerCase()) {
    case "memory":
    default:
      return {
        todoRepo: new InMemoryTodoRepository(),
        userRepo: new InMemoryUserRepository(),
      };
  }
}
