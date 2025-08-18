import { type TaskAssignment, type InsertTaskAssignment, type Tasks } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getTaskAssignmentByDate(date: string): Promise<TaskAssignment | undefined>;
  getTaskAssignmentsByDateRange(dates: string[]): Promise<TaskAssignment[]>;
  createOrUpdateTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment>;
  assignTask(date: string, taskType: string, resident: string | null): Promise<TaskAssignment>;
  setAloneInKitchen(date: string, resident: string | null): Promise<TaskAssignment>;
  setDishOfTheDay(date: string, dish: string | null): Promise<TaskAssignment>;
  resetTasks(date: string): Promise<TaskAssignment>;
}

export class MemStorage implements IStorage {
  private taskAssignments: Map<string, TaskAssignment>;

  constructor() {
    this.taskAssignments = new Map();
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
      });
    }

    const updatedTasks = { ...existing.tasks as Tasks };
    updatedTasks[taskType as keyof Tasks] = resident;

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: updatedTasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: existing.dishOfTheDay,
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
      });
    }

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks as Tasks,
      aloneInKitchen: resident,
      dishOfTheDay: existing.dishOfTheDay,
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
      });
    }

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks as Tasks,
      aloneInKitchen: existing.aloneInKitchen,
      dishOfTheDay: dish,
    });
  }

  async resetTasks(date: string): Promise<TaskAssignment> {
    return this.createOrUpdateTaskAssignment({
      date,
      tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
      aloneInKitchen: null,
      dishOfTheDay: null,
    });
  }
}

export const storage = new MemStorage();
