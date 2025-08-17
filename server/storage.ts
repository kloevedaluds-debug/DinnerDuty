import { type TaskAssignment, type InsertTaskAssignment, type Tasks, type Resident } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getTaskAssignmentByDate(date: string): Promise<TaskAssignment | undefined>;
  createOrUpdateTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment>;
  assignTask(date: string, taskType: string, resident: Resident | null): Promise<TaskAssignment>;
  setAloneInKitchen(date: string, resident: Resident | null): Promise<TaskAssignment>;
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
      };
      this.taskAssignments.set(assignment.date, newAssignment);
      return newAssignment;
    }
  }

  async assignTask(date: string, taskType: string, resident: Resident | null): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
      });
    }

    const updatedTasks = { ...existing.tasks as Tasks };
    updatedTasks[taskType as keyof Tasks] = resident;

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: updatedTasks,
      aloneInKitchen: existing.aloneInKitchen,
    });
  }

  async setAloneInKitchen(date: string, resident: Resident | null): Promise<TaskAssignment> {
    let existing = await this.getTaskAssignmentByDate(date);
    
    if (!existing) {
      existing = await this.createOrUpdateTaskAssignment({
        date,
        tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
        aloneInKitchen: null,
      });
    }

    return this.createOrUpdateTaskAssignment({
      date,
      tasks: existing.tasks,
      aloneInKitchen: resident,
    });
  }

  async resetTasks(date: string): Promise<TaskAssignment> {
    return this.createOrUpdateTaskAssignment({
      date,
      tasks: { kok: null, indkoeb: null, bord: null, opvask: null },
      aloneInKitchen: null,
    });
  }
}

export const storage = new MemStorage();
