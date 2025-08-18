import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const taskAssignments = pgTable("task_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  tasks: jsonb("tasks").notNull(), // {kok: string|null, indkoeb: string|null, bord: string|null, opvask: string|null}
  aloneInKitchen: text("alone_in_kitchen"), // resident name or null
  dishOfTheDay: text("dish_of_the_day"), // the planned dish/meal for the day
  shoppingList: jsonb("shopping_list").default('[]'), // array of shopping items for the cook
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
});

export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;
export type TaskAssignment = typeof taskAssignments.$inferSelect;

// Task types for type safety
export type TaskType = 'kok' | 'indkoeb' | 'bord' | 'opvask';
export type Tasks = Record<TaskType, string | null>;

// Helper functions for date operations
export function getWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

export function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return monday.toISOString().split('T')[0];
}

export function getNextWeekStart(): string {
  const currentWeekStart = getCurrentWeekStart();
  const nextWeek = new Date(currentWeekStart + 'T00:00:00');
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString().split('T')[0];
}
