import { type TaskAssignment, type InsertTaskAssignment, type Tasks, type User, type UpsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private taskAssignments: Map<string, TaskAssignment>;
  private users: Map<string, User>;

  constructor() {
    this.taskAssignments = new Map();
    this.users = new Map();
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

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: updatedTasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: existing.dishOfTheDay,
      shoppingList: existing.shoppingList ?? [],
    });
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
    const existing = this.users.get(userData.id);
    
    if (existing) {
      const updated: User = {
        ...existing,
        ...userData,
        updatedAt: new Date(),
      };
      this.users.set(userData.id, updated);
      return updated;
    } else {
      const newUser: User = {
        id: userData.id,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        isAdmin: userData.isAdmin || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(userData.id, newUser);
      return newUser;
    }
  }
}

export const storage = new MemStorage();
