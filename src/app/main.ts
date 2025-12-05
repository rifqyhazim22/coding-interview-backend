import express, { NextFunction, Request, Response } from "express";
import { InMemoryUserRepository } from "../infra/InMemoryUserRepository";
import { InMemoryTodoRepository } from "../infra/InMemoryTodoRepository";
import { SimpleScheduler } from "../infra/SimpleScheduler";
import { TodoService } from "../core/TodoService";
import { NotFoundError, ValidationError } from "../core/errors";

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

async function bootstrap() {
  const userRepo = new InMemoryUserRepository();
  const todoRepo = new InMemoryTodoRepository();
  const scheduler = new SimpleScheduler();
  const todoService = new TodoService(todoRepo, userRepo);

  const app = express();
  app.use(express.json());

  app.post(
    "/users",
    asyncHandler(async (req, res) => {
      const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

      if (!email || !name) {
        throw new ValidationError("email and name are required");
      }

      const user = await userRepo.create({ email, name });
      res.status(201).json(user);
    })
  );

  app.post(
    "/todos",
    asyncHandler(async (req, res) => {
      const todo = await todoService.createTodo({
        userId: req.body.userId,
        title: req.body.title,
        description: req.body.description,
        remindAt: req.body.remindAt ?? undefined,
      });
      res.status(201).json(todo);
    })
  );

  app.get(
    "/todos",
    asyncHandler(async (req, res) => {
      const userId = req.query.userId;

      if (!userId || typeof userId !== "string") {
        throw new ValidationError("userId query parameter is required");
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with id ${userId} not found`);
      }

      const todos = await todoService.getTodosByUser(userId);
      res.json(todos);
    })
  );

  app.patch(
    "/todos/:id/complete",
    asyncHandler(async (req, res) => {
      const todo = await todoService.completeTodo(req.params.id);
      res.json(todo);
    })
  );

  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      void _next;
      if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message });
      }

      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  );

  const port = Number(process.env.PORT) || 3000;
  await new Promise<void>((resolve) => {
    app.listen(port, () => resolve());
  });

  scheduler.scheduleRecurring("reminder-check", 60_000, () =>
    todoService.processReminders(new Date())
  );

  console.log(`Todo Reminder Service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start application", err);
  process.exit(1);
});
