import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
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

// Format date as YYYY-MM-DD in local timezone
export function formatLocalYMD(date: Date): string {
  date.setHours(0, 0, 0, 0); // Normalize to local midnight
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export function getWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    date.setHours(0, 0, 0, 0); // Normalize to local midnight
    dates.push(formatLocalYMD(date));
  }
  
  return dates;
}

export function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0); // Normalize to local midnight
  return formatLocalYMD(monday);
}

export function getNextWeekStart(): string {
  const currentWeekStart = getCurrentWeekStart();
  const nextWeek = new Date(currentWeekStart + 'T00:00:00');
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0); // Normalize to local midnight
  return formatLocalYMD(nextWeek);
}

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth with admin role
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false), // Admin role for content management
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// App content/settings schema for admin management
export const appContent = pgTable("app_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: varchar("description", { length: 500 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppContentSchema = createInsertSchema(appContent).omit({
  id: true,
  updatedAt: true,
});

export type InsertAppContent = z.infer<typeof insertAppContentSchema>;
export type AppContent = typeof appContent.$inferSelect;
