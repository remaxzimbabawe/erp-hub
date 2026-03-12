/**
 * Rewards Program Database Operations
 */
import { logAction } from './auditLog';
import type {
  RewardsProgram,
  RewardsTier,
  ClientRewardsBalance,
  RewardsCashout,
  RewardsPointLog,
  RewardsProgramStatus,
  ProductTemplate,
} from '@/types';

// We access the database through a lazy import pattern to avoid circular deps
let _getDb: () => { db: any; save: (db: any) => void; generateId: (prefix: string) => string; currentUserId: () => string | null };

export function initRewards(accessor: typeof _getDb) {
  _getDb = accessor;
}

function ensureCollections(db: any) {
  if (!db.rewardsPrograms) db.rewardsPrograms = [];
  if (!db.rewardsTiers) db.rewardsTiers = [];
  if (!db.clientRewardsBalances) db.clientRewardsBalances = [];
  if (!db.rewardsCashouts) db.rewardsCashouts = [];
  if (!db.rewardsPointLogs) db.rewardsPointLogs = [];
}

function audit(action: string, entityType: string, entityId: string, changes: { field: string; from: unknown; to: unknown }[], description: string) {
  const { currentUserId } = _getDb();
  const userId = currentUserId();
  if (userId) {
    logAction(userId, action, entityType, entityId, changes, description);
  }
}

// ── Programs ─────────────────────────────────────────

export function getRewardsPrograms(): RewardsProgram[] {
  const { db } = _getDb();
  ensureCollections(db);
  return db.rewardsPrograms;
}

export function getRewardsProgram(id: string): RewardsProgram | undefined {
  return getRewardsPrograms().find(p => p._id === id);
}

export function getActiveRewardsPrograms(): RewardsProgram[] {
  return getRewardsPrograms().filter(p => p.isActive && p.status === 'active');
}

export function createRewardsProgram(data: Omit<RewardsProgram, '_id' | '_creationTime' | 'isActive' | 'status' | 'includedTemplateIds'>): RewardsProgram {
  const { db, save, generateId } = _getDb();
  ensureCollections(db);
  const program: RewardsProgram = {
    ...data,
    _id: generateId('rwprog'),
    _creationTime: Date.now(),
    isActive: true,
    status: 'active',
    includedTemplateIds: [],
  };
  db.rewardsPrograms.push(program);
  save(db);
  audit('create', 'rewardsProgram', program._id, [{ field: 'name', from: null, to: data.name }], `Created rewards program "${data.name}"`);
  return program;
}

export function updateRewardsProgram(id: string, data: Partial<RewardsProgram>): RewardsProgram | undefined {
  const { db, save } = _getDb();
  ensureCollections(db);
  const idx = db.rewardsPrograms.findIndex((p: RewardsProgram) => p._id === id);
  if (idx === -1) return undefined;
  const old = { ...db.rewardsPrograms[idx] };
  db.rewardsPrograms[idx] = { ...old, ...data };
  save(db);
  audit('update', 'rewardsProgram', id, [{ field: 'name', from: old.name, to: db.rewardsPrograms[idx].name }], `Updated rewards program "${db.rewardsPrograms[idx].name}"`);
  return db.rewardsPrograms[idx];
}

export function setRewardsProgramStatus(id: string, status: RewardsProgramStatus): RewardsProgram | undefined {
  const isActive = status === 'active';
  return updateRewardsProgram(id, { status, isActive });
}

export function applyPriceRuleToProgram(programId: string, minPriceInCents: number, templates: ProductTemplate[]): string[] {
  const eligible = templates.filter(t => t.priceInCents >= minPriceInCents).map(t => t._id);
  updateRewardsProgram(programId, { includedTemplateIds: eligible, minProductPriceInCents: minPriceInCents });
  return eligible;
}

// ── Tiers ─────────────────────────────────────────

export function getRewardsTiers(programId?: string): RewardsTier[] {
  const { db } = _getDb();
  ensureCollections(db);
  if (programId) return db.rewardsTiers.filter((t: RewardsTier) => t.programId === programId);
  return db.rewardsTiers;
}

export function createRewardsTier(data: Omit<RewardsTier, '_id'>): RewardsTier {
  const { db, save, generateId } = _getDb();
  ensureCollections(db);
  const tier: RewardsTier = { ...data, _id: generateId('rwtier') };
  db.rewardsTiers.push(tier);
  save(db);
  audit('create', 'rewardsTier', tier._id, [{ field: 'rewardName', from: null, to: data.rewardName }], `Added tier "${data.rewardName}" (${data.pointsRequired} pts)`);
  return tier;
}

export function updateRewardsTier(id: string, data: Partial<RewardsTier>): RewardsTier | undefined {
  const { db, save } = _getDb();
  ensureCollections(db);
  const idx = db.rewardsTiers.findIndex((t: RewardsTier) => t._id === id);
  if (idx === -1) return undefined;
  db.rewardsTiers[idx] = { ...db.rewardsTiers[idx], ...data };
  save(db);
  return db.rewardsTiers[idx];
}

export function deleteRewardsTier(id: string): boolean {
  const { db, save } = _getDb();
  ensureCollections(db);
  const idx = db.rewardsTiers.findIndex((t: RewardsTier) => t._id === id);
  if (idx === -1) return false;
  const tier = db.rewardsTiers[idx];
  db.rewardsTiers.splice(idx, 1);
  save(db);
  audit('delete', 'rewardsTier', id, [{ field: 'rewardName', from: tier.rewardName, to: null }], `Removed tier "${tier.rewardName}"`);
  return true;
}

// ── Balances ─────────────────────────────────────────

export function getClientRewardsBalances(programId?: string, clientId?: string): ClientRewardsBalance[] {
  const { db } = _getDb();
  ensureCollections(db);
  let balances: ClientRewardsBalance[] = db.clientRewardsBalances;
  if (programId) balances = balances.filter(b => b.programId === programId);
  if (clientId) balances = balances.filter(b => b.clientId === clientId);
  return balances;
}

function getOrCreateBalance(clientId: string, programId: string): ClientRewardsBalance {
  const { db, save, generateId } = _getDb();
  ensureCollections(db);
  let balance = db.clientRewardsBalances.find((b: ClientRewardsBalance) => b.clientId === clientId && b.programId === programId);
  if (!balance) {
    balance = { _id: generateId('rwbal'), clientId, programId, currentPoints: 0, totalPointsEarned: 0, totalPointsCashedOut: 0 };
    db.clientRewardsBalances.push(balance);
    save(db);
  }
  return balance;
}

// ── Point Allocation ─────────────────────────────────

export function allocatePointsForSale(
  clientId: string,
  saleId: string,
  participatingAmountInCentsByProgram: Map<string, number>
): { programId: string; points: number }[] {
  const { db, save, generateId } = _getDb();
  ensureCollections(db);

  const activePrograms = getActiveRewardsPrograms();
  const allocations: { programId: string; points: number; amount: number }[] = [];

  for (const program of activePrograms) {
    const amount = participatingAmountInCentsByProgram.get(program._id) || 0;
    if (amount < program.thresholdAmountInCents) continue;

    let points: number;
    if (program.continuousAllocation) {
      const thresholdsMet = Math.floor(amount / program.thresholdAmountInCents);
      points = thresholdsMet * program.pointsPerThreshold;
    } else {
      points = program.pointsPerThreshold;
    }

    allocations.push({ programId: program._id, points, amount });
  }

  if (allocations.length === 0) return [];

  // Only use the program with the highest points
  allocations.sort((a, b) => b.points - a.points);
  const best = allocations[0];

  // Update balance
  const balance = getOrCreateBalance(clientId, best.programId);
  balance.currentPoints += best.points;
  balance.totalPointsEarned += best.points;
  save(db);

  // Log
  const log: RewardsPointLog = {
    _id: generateId('rwlog'),
    _creationTime: Date.now(),
    clientId,
    programId: best.programId,
    saleId,
    pointsAwarded: best.points,
    qualifyingAmountInCents: best.amount,
  };
  db.rewardsPointLogs.push(log);
  save(db);

  const program = getRewardsProgram(best.programId);
  audit('create', 'rewardsPointAllocation', log._id, [
    { field: 'points', from: 0, to: best.points },
    { field: 'program', from: null, to: program?.name },
  ], `Allocated ${best.points} points to client in "${program?.name}"`);

  return [{ programId: best.programId, points: best.points }];
}

// ── Cashout ─────────────────────────────────────────

export function getRewardsCashouts(programId?: string, clientId?: string): RewardsCashout[] {
  const { db } = _getDb();
  ensureCollections(db);
  let cashouts: RewardsCashout[] = db.rewardsCashouts;
  if (programId) cashouts = cashouts.filter(c => c.programId === programId);
  if (clientId) cashouts = cashouts.filter(c => c.clientId === clientId);
  return cashouts;
}

export function cashoutRewards(clientId: string, programId: string, tierId: string, processedBy: string): RewardsCashout | null {
  const { db, save, generateId } = _getDb();
  ensureCollections(db);

  const tier = db.rewardsTiers.find((t: RewardsTier) => t._id === tierId);
  if (!tier) return null;

  const balance = getOrCreateBalance(clientId, programId);
  if (balance.currentPoints < tier.pointsRequired) return null;

  balance.currentPoints -= tier.pointsRequired;
  balance.totalPointsCashedOut += tier.pointsRequired;

  const cashout: RewardsCashout = {
    _id: generateId('rwcash'),
    _creationTime: Date.now(),
    clientId,
    programId,
    tierId,
    pointsRedeemed: tier.pointsRequired,
    rewardName: tier.rewardName,
    processedBy,
  };
  db.rewardsCashouts.push(cashout);
  save(db);

  audit('create', 'rewardsCashout', cashout._id, [
    { field: 'pointsRedeemed', from: null, to: tier.pointsRequired },
    { field: 'reward', from: null, to: tier.rewardName },
  ], `Cashed out ${tier.pointsRequired} pts for "${tier.rewardName}"`);

  return cashout;
}

// ── Point Logs ──────────────────────────────────────

export function getRewardsPointLogs(programId?: string, clientId?: string): RewardsPointLog[] {
  const { db } = _getDb();
  ensureCollections(db);
  let logs: RewardsPointLog[] = db.rewardsPointLogs;
  if (programId) logs = logs.filter(l => l.programId === programId);
  if (clientId) logs = logs.filter(l => l.clientId === clientId);
  return logs;
}

// ── Helpers for POS ──────────────────────────────────

export function getProductRewardsInfo(templateId: string): { programId: string; programName: string; potentialPointsDesc: string }[] {
  const programs = getActiveRewardsPrograms();
  const result: { programId: string; programName: string; potentialPointsDesc: string }[] = [];
  for (const p of programs) {
    if (p.includedTemplateIds.includes(templateId)) {
      result.push({
        programId: p._id,
        programName: p.name,
        potentialPointsDesc: `${p.pointsPerThreshold} pts per $${(p.thresholdAmountInCents / 100).toFixed(2)} spent${p.continuousAllocation ? ' (stacking)' : ''}`,
      });
    }
  }
  return result;
}
