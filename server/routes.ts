import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { getWeekDates, getCurrentWeekStart, getNextWeekStart } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get current date in YYYY-MM-DD format
  function getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Get task assignments for a specific date (defaults to today)
  app.get("/api/tasks/:date?", async (req, res) => {
    try {
      const date = req.params.date || getCurrentDate();
      const assignment = await storage.getTaskAssignmentByDate(date);
      
      if (!assignment) {
        // Return default empty state
        res.json({
          date,
          tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
          aloneInKitchen: null,
          dishOfTheDay: null,
        });
      } else {
        res.json(assignment);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task assignments" });
    }
  });

  // Assign a task to a resident
  app.post("/api/tasks/assign", async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().optional(),
        taskType: z.enum(['kok', 'indkoeb', 'bord', 'opvask']),
        resident: z.string().nullable(),
      });

      const { date = getCurrentDate(), taskType, resident } = schema.parse(req.body);
      const assignment = await storage.assignTask(date, taskType, resident);
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to assign task" });
      }
    }
  });

  // Set kitchen preference (alone or not)
  app.post("/api/tasks/kitchen-preference", async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().optional(),
        resident: z.string().nullable(),
      });

      const { date = getCurrentDate(), resident } = schema.parse(req.body);
      const assignment = await storage.setAloneInKitchen(date, resident);
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to set kitchen preference" });
      }
    }
  });

  // Set dish of the day
  app.post("/api/tasks/dish-of-the-day", async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().optional(),
        dish: z.string().nullable(),
      });

      const { date = getCurrentDate(), dish } = schema.parse(req.body);
      const assignment = await storage.setDishOfTheDay(date, dish);
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to set dish of the day" });
      }
    }
  });

  // Get week view with all assignments
  app.get("/api/tasks/week/:weekStart?", async (req, res) => {
    try {
      const weekStart = req.params.weekStart || getCurrentWeekStart();
      const weekDates = getWeekDates(weekStart);
      const assignments = await storage.getTaskAssignmentsByDateRange(weekDates);
      
      res.json({
        weekStart,
        dates: weekDates,
        assignments,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch week assignments" });
    }
  });

  // Reset all tasks for a date
  app.post("/api/tasks/reset", async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().optional(),
      });

      const { date = getCurrentDate() } = schema.parse(req.body);
      const assignment = await storage.resetTasks(date);
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to reset tasks" });
      }
    }
  });

  // Shopping list routes
  app.post("/api/shopping-list/add", async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().optional(),
        item: z.string(),
      });

      const { date = getCurrentDate(), item } = schema.parse(req.body);
      const assignment = await storage.addShoppingItem(date, item);
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add shopping item" });
      }
    }
  });

  app.post("/api/shopping-list/remove", async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().optional(),
        index: z.number(),
      });

      const { date = getCurrentDate(), index } = schema.parse(req.body);
      const assignment = await storage.removeShoppingItem(date, index);
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to remove shopping item" });
      }
    }
  });

  app.post("/api/shopping-list/update", async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().optional(),
        items: z.array(z.string()),
      });

      const { date = getCurrentDate(), items } = schema.parse(req.body);
      const assignment = await storage.updateShoppingList(date, items);
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update shopping list" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
