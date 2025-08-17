import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const taskAssignments = pgTable("task_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  tasks: jsonb("tasks").notNull(), // {kok: string|null, indkoeb: string|null, bord: string|null, opvask: string|null}
  aloneInKitchen: text("alone_in_kitchen"), // resident name or null
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
});

export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;
export type TaskAssignment = typeof taskAssignments.$inferSelect;

// Task types for type safety
export type TaskType = 'kok' | 'indkoeb' | 'bord' | 'opvask';
export type Tasks = Record<TaskType, string | null>;

// Resident names
export const RESIDENTS = ["Anna", "Bo", "Carla", "David"] as const;
export type Resident = typeof RESIDENTS[number];
