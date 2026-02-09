import { endOfWeek, startOfWeek } from 'date-fns';
import type { FocusRecord } from '../store/useTaskStore';

export function computeLeavesGained(durationSeconds: number) {
  return Math.floor(Math.max(0, durationSeconds) / (25 * 60));
}

export function computeWeeklyLeavesBefore(focusRecords: FocusRecord[], lastRecordId: string | null) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).getTime();
  return focusRecords
    .filter((r) => {
      if (!r.completedAt) return false;
      const t = new Date(r.completedAt).getTime();
      if (Number.isNaN(t)) return false;
      if (t < weekStart || t > weekEnd) return false;
      if (lastRecordId && r.id === lastRecordId) return false;
      return true;
    })
    .reduce((sum, r) => sum + computeLeavesGained(r.duration || 0), 0);
}

export function computeSynthesisDetail(weeklyLeavesBefore: number, leavesGained: number) {
  const toTiers = (leaves: number) => {
    const shrubs = Math.floor(leaves / 3);
    const sprouts = Math.floor(shrubs / 3);
    const trees = Math.floor(sprouts / 3);
    const tree2 = Math.floor(trees / 3);
    return { shrubs, sprouts, trees, tree2 };
  };

  const before = toTiers(weeklyLeavesBefore);
  const after = toTiers(weeklyLeavesBefore + leavesGained);

  const deltas = {
    shrub: Math.max(0, after.shrubs - before.shrubs),
    sprout: Math.max(0, after.sprouts - before.sprouts),
    tree: Math.max(0, after.trees - before.trees),
    tree2: Math.max(0, after.tree2 - before.tree2)
  };

  if (deltas.tree2 > 0) return null;
  if (deltas.tree > 0) return '🌱×3 → 🌳';
  if (deltas.sprout > 0) return '🌿×3 → 🌱';
  if (deltas.shrub > 0) return '🍃×3 → 🌿';
  return null;
}

export function buildFocusRewardToastPayload(args: {
  durationSeconds: number;
  focusRecords: FocusRecord[];
  lastRecordId: string | null;
}) {
  const minutes = Math.max(1, Math.floor(Math.max(0, args.durationSeconds) / 60));
  const leaves = computeLeavesGained(args.durationSeconds);
  const before = computeWeeklyLeavesBefore(args.focusRecords, args.lastRecordId);
  const formula = computeSynthesisDetail(before, leaves);

  const title = leaves > 0 ? `已记录：${minutes}min · 🍃+${leaves}` : `已记录：${minutes}min`;
  return { title, subtitle: formula || undefined };
}

