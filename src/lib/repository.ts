import type { PulseState } from "@/types";

/**
 * The app talks to storage through this one interface. Today it is
 * localStorage — replacing it with a Supabase-backed repository is a
 * matter of implementing `load` and `save` (per-user upsert), no view
 * or store changes required.
 */
export interface PulseRepository {
  load(): Promise<PulseState | null>;
  save(state: PulseState): Promise<void>;
}

export const localStorageRepository: PulseRepository = {
  async load() {
    return null; // zustand persist hydrates synchronously; a remote adapter would fetch here
  },
  async save() {
    /* zustand persist writes through on every change */
  },
};
