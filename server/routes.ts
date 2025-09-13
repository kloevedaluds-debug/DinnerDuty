import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { z } from "zod";
import { getWeekDates, getCurrentWeekStart, getNextWeekStart } from "@shared/schema";

// Generate ICS (iCalendar) content for task assignments
function generateICSContent(date: string, taskType: string, resident: string, taskTitle: string, description: string): string {
  const now = new Date();
  const eventDate = new Date(date);
  
  // Set event time based on task type
  const taskTimes = {
    kok: { start: "17:00", end: "19:00" },       // Cooking: 5-7 PM
    indkoeb: { start: "15:00", end: "16:00" },   // Shopping: 3-4 PM
    bord: { start: "17:30", end: "18:00" },     // Table setting: 5:30-6 PM
    opvask: { start: "19:00", end: "20:00" },   // Dishes: 7-8 PM
  };
  
  const times = taskTimes[taskType as keyof typeof taskTimes] || { start: "17:00", end: "18:00" };
  
  // Format dates for ICS
  const formatICSDate = (date: Date, time: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const [hour, minute] = time.split(':');
    return `${year}${month}${day}T${hour}${minute}00`;
  };
  
  const startDateTime = formatICSDate(eventDate, times.start);
  const endDateTime = formatICSDate(eventDate, times.end);
  const createdDateTime = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Generate unique ID
  const uid = `${taskType}-${resident}-${date}-${Date.now()}@dinnerduty.onrender.com`;
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DinnerDuty//Task Assignment//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${createdDateTime}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${taskTitle} - ${resident}
DESCRIPTION:${description}\nTildelt til: ${resident}
LOCATION:Køkkenet
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Auth routes - support both auth modes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const AUTH_MODE = process.env.AUTH_MODE || (process.env.REPL_ID ? "replit" : "basic");
      
      if (AUTH_MODE === "basic") {
        const sessionUser = (req.session as any).user;
        return res.json({
          id: sessionUser.id,
          email: sessionUser.email,
          firstName: sessionUser.firstName,
          lastName: sessionUser.lastName,
          profileImageUrl: null,
          isAdmin: sessionUser.isAdmin
        });
      }
      
      // Replit mode
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
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

  // Generate calendar (.ics) file for task assignment
  app.get("/api/tasks/calendar/:date/:taskType/:resident", async (req, res) => {
    try {
      const { date, taskType, resident } = req.params;
      
      // Validate taskType
      const validTasks = ['kok', 'indkoeb', 'bord', 'opvask'];
      if (!validTasks.includes(taskType)) {
        return res.status(400).json({ message: "Invalid task type" });
      }
      
      // Task configurations for calendar
      const taskConfig = {
        kok: { title: "Kok", description: "Tilberede aftensmaden" },
        indkoeb: { title: "Indkøb", description: "Handle ingredienser" },
        bord: { title: "Dække bord", description: "Sætte bordet til aftensmad" },
        opvask: { title: "Vaske op", description: "Rydde op efter måltidet" },
      };
      
      const task = taskConfig[taskType as keyof typeof taskConfig];
      const icsContent = generateICSContent(date, taskType, resident, task.title, task.description);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${task.title}_${resident}_${date}.ics"`);
      res.send(icsContent);
    } catch (error) {
      console.error("Error generating calendar file:", error);
      res.status(500).json({ message: "Failed to generate calendar file" });
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

  // Secure admin grant - only for authorized emails
  app.post("/api/admin/make-admin", isAuthenticated, async (req: any, res) => {
    try {
      const AUTH_MODE = process.env.AUTH_MODE || (process.env.REPL_ID ? "replit" : "basic");
      let userEmail: string;
      let userId: string;
      
      if (AUTH_MODE === "basic") {
        const sessionUser = (req.session as any).user;
        userEmail = sessionUser.email;
        userId = sessionUser.id;
      } else {
        userEmail = req.user.claims.email;
        userId = req.user.claims.sub;
      }
      
      // Security: Only allow specific emails to become admin
      const AUTHORIZED_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // In development, allow any email to become admin for testing purposes
      if (!isDevelopment && !AUTHORIZED_ADMIN_EMAILS.includes(userEmail)) {
        return res.status(403).json({ message: "Not authorized to become admin" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.upsertUser({
        ...user,
        isAdmin: true,
      });
      
      res.json({ message: "Admin access granted", user: updatedUser });
    } catch (error) {
      console.error("Error granting admin access:", error);
      res.status(500).json({ message: "Failed to grant admin access" });
    }
  });

  // Auth user route - returns current user info

  // Protected admin route to check admin status
  app.get("/api/admin/status", isAdmin, async (req: any, res) => {
    res.json({ message: "Admin access confirmed", isAdmin: true });
  });

  // Admin content management routes
  app.get("/api/admin/content", isAdmin, async (req, res) => {
    try {
      const content = await storage.getAllAppContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/admin/content/:key", isAdmin, async (req, res) => {
    try {
      const content = await storage.getAppContent(req.params.key);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.put("/api/admin/content/:key", isAdmin, async (req, res) => {
    try {
      const schema = z.object({
        value: z.string(),
        description: z.string().optional(),
      });

      const { value, description } = schema.parse(req.body);
      
      const content = await storage.upsertAppContent({
        key: req.params.key,
        value,
        description,
      });
      
      res.json(content);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error updating content:", error);
        res.status(500).json({ message: "Failed to update content" });
      }
    }
  });

  app.delete("/api/admin/content/:key", isAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteAppContent(req.params.key);
      if (!deleted) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
