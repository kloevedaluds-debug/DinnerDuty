import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { RESIDENTS } from "@shared/schema";

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
        resident: z.enum(RESIDENTS).nullable(),
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
        resident: z.enum(RESIDENTS).nullable(),
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

  const httpServer = createServer(app);
  return httpServer;
}
