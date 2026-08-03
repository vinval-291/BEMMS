import { Equipment, Job, Schedule } from '../types';

export const INITIAL_EQUIPMENT: Equipment[] = [];

export const INITIAL_JOBS: Job[] = [];

export const INITIAL_SCHEDULES: Schedule[] = [];

export async function seedInitialDatabase() {
  // Seeding disabled to allow real staff and machines setup
  console.log('Seeding skipped for a clean production setup.');
}
