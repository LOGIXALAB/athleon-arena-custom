import type { SportModule } from "./contract";
import { cricket } from "./cricket/module";
import { futsal } from "./futsal/module";
// import { padel } from "./padel/module";  // ← adding a sport is this line + the module file

const modules = new Map<string, SportModule>();
for (const m of [cricket, futsal /*, padel */]) {
  modules.set(m.key, m as SportModule);
}

export const SportRegistry = {
  get(key: string): SportModule {
    const m = modules.get(key);
    if (!m) throw new Error(`No sport module registered for '${key}'`);
    return m;
  },
  has(key: string): boolean {
    return modules.has(key);
  },
  active(): SportModule[] {
    return [...modules.values()];
  },
};
