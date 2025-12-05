import express, { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { SimpleScheduler } from "../infra/SimpleScheduler";
import { TodoService } from "../core/TodoService";
import { NotFoundError, ValidationError } from "../core/errors";
import { createRepositories } from "./repositoryFactory";

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

async function bootstrap() {
  const { userRepo, todoRepo } = createRepositories(process.env.STORE_KIND);
  const scheduler = new SimpleScheduler();
  const todoService = new TodoService(todoRepo, userRepo);

  const app = express();
  app.use(express.json());

  const createUserSchema = z.object({
    email: z.string().trim().email(),
    name: z.string().trim().min(1, "name is required"),
  });

  const createTodoSchema = z.object({
    userId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().optional(),
    remindAt: z.string().datetime().optional(),
  });

  app.post(
    "/users",
    asyncHandler(async (req, res) => {
      const parsed = createUserSchema.parse(req.body);

      const user = await userRepo.create({
        email: parsed.email,
        name: parsed.name,
      });
      res.status(201).json(user);
    })
  );

  app.post(
    "/todos",
    asyncHandler(async (req, res) => {
      const parsed = createTodoSchema.parse(req.body);
      const todo = await todoService.createTodo(parsed);
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

      const limitSchema = z
        .string()
        .transform((val) => Number(val))
        .refine((num) => !Number.isNaN(num), "limit must be a number")
        .nonnegative()
        .optional();
      const offsetSchema = z
        .string()
        .transform((val) => Number(val))
        .refine((num) => !Number.isNaN(num), "offset must be a number")
        .nonnegative()
        .optional();

      const limit =
        typeof req.query.limit === "string"
          ? limitSchema.parse(req.query.limit)
          : undefined;
      const offset =
        typeof req.query.offset === "string"
          ? offsetSchema.parse(req.query.offset)
          : undefined;

      const todos = await todoService.getTodosByUser(userId, {
        limit,
        offset,
      });
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

  app.delete(
    "/todos/:id",
    asyncHandler(async (req, res) => {
      await todoService.deleteTodo(req.params.id);
      res.status(204).send();
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
      if (err instanceof ValidationError || err instanceof z.ZodError) {
        const message =
          err instanceof z.ZodError
            ? err.errors.map((e) => e.message).join(", ")
            : err.message;
        return res.status(400).json({ error: message });
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
