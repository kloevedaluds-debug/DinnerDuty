import { type TaskAssignment, type InsertTaskAssignment, type Tasks, type User, type UpsertUser, type AppContent, type InsertAppContent, getCurrentWeekStart, getWeekDates } from "@shared/schema";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export interface IStorage {
  getTaskAssignmentByDate(date: string): Promise<TaskAssignment | undefined>;
  getTaskAssignmentsByDateRange(dates: string[]): Promise<TaskAssignment[]>;
  createOrUpdateTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment>;
  assignTask(date: string, taskType: string, resident: string | null): Promise<TaskAssignment>;
  setAloneInKitchen(date: string, resident: string | null): Promise<TaskAssignment>;
  setDishOfTheDay(date: string, dish: string | null): Promise<TaskAssignment>;
  resetTasks(date: string): Promise<TaskAssignment>;
  // Shopping list management
  addShoppingItem(date: string, item: string): Promise<TaskAssignment>;
  removeShoppingItem(date: string, index: number): Promise<TaskAssignment>;
  updateShoppingList(date: string, items: string[]): Promise<TaskAssignment>;
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // App content management for admin
  getAppContent(key: string): Promise<AppContent | undefined>;
  getAllAppContent(): Promise<AppContent[]>;
  upsertAppContent(content: InsertAppContent): Promise<AppContent>;
  deleteAppContent(key: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private taskAssignments: Map<string, TaskAssignment>;
  private users: Map<string, User>;
  private appContent: Map<string, AppContent>;
  private dataDir: string;

  constructor() {
    this.taskAssignments = new Map();
    this.users = new Map();
    this.appContent = new Map();
    this.dataDir = path.join(process.cwd(), 'data');
    
    // Initialize and load data
    void this.initializeStorage();
  }
  
  private async initializeStorage() {
    // Ensure data directory exists
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Load existing data or initialize defaults
    await this.loadData();
    
    // Initialize default content for admin management
    this.initializeDefaultContent();
    
    // Ensure current week data exists
    this.ensureCurrentWeekData();
    
    // Save initial state
    await this.saveData();
  }
  
  private async loadData() {
    try {
      // Load task assignments
      const tasksPath = path.join(this.dataDir, 'tasks.json');
      try {
        const tasksData = await fs.readFile(tasksPath, 'utf-8');
        const tasks = JSON.parse(tasksData) as Record<string, TaskAssignment>;
        this.taskAssignments = new Map(Object.entries(tasks));
      } catch {
        // File doesn't exist or is invalid, start fresh
      }
      
      // Load users
      const usersPath = path.join(this.dataDir, 'users.json');
      try {
        const usersData = await fs.readFile(usersPath, 'utf-8');
        const users = JSON.parse(usersData) as Record<string, User>;
        this.users = new Map(Object.entries(users));
      } catch {
        // File doesn't exist or is invalid, start fresh
      }
      
      // Load app content
      const contentPath = path.join(this.dataDir, 'content.json');
      try {
        const contentData = await fs.readFile(contentPath, 'utf-8');
        const content = JSON.parse(contentData) as Record<string, AppContent>;
        this.appContent = new Map(Object.entries(content));
      } catch {
        // File doesn't exist or is invalid, start fresh
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Continue with empty maps
    }
  }
  
  private async saveData() {
    try {
      // Save task assignments
      const tasksPath = path.join(this.dataDir, 'tasks.json');
      const tasksData = Object.fromEntries(this.taskAssignments);
      await fs.writeFile(tasksPath, JSON.stringify(tasksData, null, 2));
      
      // Save users
      const usersPath = path.join(this.dataDir, 'users.json');
      const usersData = Object.fromEntries(this.users);
      await fs.writeFile(usersPath, JSON.stringify(usersData, null, 2));
      
      // Save app content
      const contentPath = path.join(this.dataDir, 'content.json');
      const contentData = Object.fromEntries(this.appContent);
      await fs.writeFile(contentPath, JSON.stringify(contentData, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }
  
  private initializeDefaultContent() {
    const defaultContent: Record<string, { value: string; description: string }> = {
      'app.title': {
        value: 'Aftensmad i dag',
        description: 'Hovedtitel på appen'
      },
      'instructions.how_to_use': {
        value: '💡 Hvordan bruger du appen',
        description: 'Hovedoverskrift for instruktioner'
      },
      'instructions.assign_tasks': {
        value: 'Skriv et navn og tryk Enter for at tildele opgaver',
        description: 'Instruktion for opgavetildeling'
      },
      'instructions.auto_save': {
        value: '✅ Alle ændringer gemmes automatisk',
        description: 'Information om automatisk gemning'
      },
      'notice.dishwashing_requirement': {
        value: 'Bemærk: Beboere der ikke tager andre opgaver skal deltage i opvask, medmindre andet er aftalt med personalet.',
        description: 'Vigtig meddelelse om opvask deltagelse'
      }
    };
    
    for (const [key, { value, description }] of Object.entries(defaultContent)) {
      this.appContent.set(key, {
        id: randomUUID(),
        key,
        value,
        description,
        updatedAt: new Date(),
      });
    }
  }
  
  // Ensure current week data exists with empty assignments
  private ensureCurrentWeekData() {
    const currentWeekStart = getCurrentWeekStart();
    const weekDates = getWeekDates(currentWeekStart);
    
    for (const date of weekDates) {
      if (!this.taskAssignments.has(date)) {
        const emptyAssignment: TaskAssignment = {
          id: randomUUID(),
          date,
          tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
          aloneInKitchen: null,
          dishOfTheDay: null,
          shoppingList: [],
        };
        this.taskAssignments.set(date, emptyAssignment);
      }
    }
  }
  
  // Ensure task assignments persist across the week
  private async ensureWeekPersistence(date: string): Promise<void> {
    // Removed automatic dish copying - each day should have its own dish
    return;
  }

  async getTaskAssignmentByDate(date: string): Promise<TaskAssignment | undefined> {
    return this.taskAssignments.get(date);
  }

  async getTaskAssignmentsByDateRange(dates: string[]): Promise<TaskAssignment[]> {
    const assignments: TaskAssignment[] = [];
    
    for (const date of dates) {
      const assignment = this.taskAssignments.get(date);
      if (assignment) {
        assignments.push(assignment);
      } else {
        // Create default empty assignment for dates without data
        assignments.push({
          id: randomUUID(),
          date,
          tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
          aloneInKitchen: null,
          dishOfTheDay: null,
          shoppingList: [],
        });
      }
    }
    
    return assignments;
  }

  async createOrUpdateTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment> {
    const existing = this.taskAssignments.get(assignment.date);
    
    if (existing) {
      const updated: TaskAssignment = {
        ...existing,
        ...assignment,
      };
      this.taskAssignments.set(assignment.date, updated);
      return updated;
    } else {
      const newAssignment: TaskAssignment = {
        id: randomUUID(),
        ...assignment,
        aloneInKitchen: assignment.aloneInKitchen ?? null,
        dishOfTheDay: assignment.dishOfTheDay ?? null,
        shoppingList: assignment.shoppingList ?? [],
      };
      this.taskAssignments.set(assignment.date, newAssignment);
      return newAssignment;
    }
  }

  async assignTask(date: string, taskType: string, resident: string | null): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
        dishOfTheDay: null,
        shoppingList: [],
      });
    }

    const updatedTasks = { ...existing.tasks as Tasks };
    updatedTasks[taskType as keyof Tasks] = resident;

    const updatedAssignment = await this.createOrUpdateTaskAssignment({
      date,
      tasks: updatedTasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: existing.dishOfTheDay,
      shoppingList: existing.shoppingList ?? [],
    });
    
    // Save data to file
    await this.saveData();
    
    return updatedAssignment;
  }

  async setAloneInKitchen(date: string, resident: string | null): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
        dishOfTheDay: null,
        shoppingList: [],
      });
    }

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks as Tasks,
      aloneInKitchen: resident,
      dishOfTheDay: existing.dishOfTheDay,
      shoppingList: existing.shoppingList ?? [],
    });
  }

  async setDishOfTheDay(date: string, dish: string | null): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
        dishOfTheDay: null,
        shoppingList: [],
      });
    }

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks as Tasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: dish,
      shoppingList: existing.shoppingList ?? [],
    });
  }

  async resetTasks(date: string): Promise<TaskAssignment> {
    return this.createOrUpdateTaskAssignment({
      date,
      tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
      aloneInKitchen: null,
      dishOfTheDay: null,
      shoppingList: [],
    });
  }

  async addShoppingItem(date: string, item: string): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
        dishOfTheDay: null,
        shoppingList: [],
      });
    }

    const currentList = Array.isArray(existing.shoppingList) ? existing.shoppingList : [];
    const updatedList = [...currentList, item.trim()];

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks as Tasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: existing.dishOfTheDay,
      shoppingList: updatedList,
    });
  }

  async removeShoppingItem(date: string, index: number): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
        dishOfTheDay: null,
        shoppingList: [],
      });
    }

    const currentList = Array.isArray(existing.shoppingList) ? existing.shoppingList : [];
    const updatedList = currentList.filter((_, i) => i !== index);

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks as Tasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: existing.dishOfTheDay,
      shoppingList: updatedList,
    });
  }

  async updateShoppingList(date: string, items: string[]): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
        dishOfTheDay: null,
        shoppingList: [],
      });
    }

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks as Tasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: existing.dishOfTheDay,
      shoppingList: items.filter(item => item.trim().length > 0),
    });
  }

  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Ensure we have a user ID (from auth system or generate one)
    const userId = userData.id || randomUUID();
    const existing = this.users.get(userId);
    
    if (existing) {
      const updated: User = {
        ...existing,
        ...userData,
        id: userId,
        updatedAt: new Date(),
      };
      this.users.set(userId, updated);
      return updated;
    } else {
      const newUser: User = {
        id: userId,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        isAdmin: userData.isAdmin || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(userId, newUser);
      return newUser;
    }
  }

  // App content management methods
  async getAppContent(key: string): Promise<AppContent | undefined> {
    return this.appContent.get(key);
  }

  async getAllAppContent(): Promise<AppContent[]> {
    return Array.from(this.appContent.values());
  }

  async upsertAppContent(content: InsertAppContent): Promise<AppContent> {
    const existingContent = this.appContent.get(content.key);
    
    const contentData: AppContent = {
      id: existingContent?.id || randomUUID(),
      key: content.key,
      value: content.value,
      description: content.description ?? null,
      updatedAt: new Date(),
    };
    
    this.appContent.set(content.key, contentData);
    return contentData;
  }

  async deleteAppContent(key: string): Promise<boolean> {
    return this.appContent.delete(key);
  }
}

export const storage = new MemStorage();
