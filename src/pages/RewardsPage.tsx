import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportMenu } from "@/components/common/ExportMenu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getProductTemplates, getClients, getClient, formatPrice } from "@/lib/database";
import {
  getRewardsPrograms,
  createRewardsProgram,
  updateRewardsProgram,
  setRewardsProgramStatus,
  applyPriceRuleToProgram,
  getRewardsTiers,
  createRewardsTier,
  deleteRewardsTier,
  getClientRewardsBalances,
  cashoutRewards,
  getRewardsCashouts,
  getRewardsPointLogs,
} from "@/lib/rewards";
import type { RewardsProgram, RewardsTier, ClientRewardsBalance, RewardsCashout } from "@/types";
import {
  Gift, Plus, Trash2, Award, Star, TrendingUp,
  CheckCircle, XCircle, Pause, Play, Archive,
  DollarSign, Users, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function RewardsPage() {
  const { toast } = useToast();
  const { hasRole, currentUser } = useAuth();
  const isAdmin = hasRole('super_admin') || hasRole('manager');
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const programs = getRewardsPrograms();
  const templates = getProductTemplates();
  const clients = getClients();

  // ── Programs Tab State ─────────────────────────────
  const [showProgramDialog, setShowProgramDialog] = React.useState(false);
  const [editingProgram, setEditingProgram] = React.useState<RewardsProgram | null>(null);
  const [programForm, setProgramForm] = React.useState({
    name: '', description: '', minProductPriceInCents: 100,
    thresholdAmountInCents: 1000, pointsPerThreshold: 1, continuousAllocation: true,
  });

  // ── Tiers Tab State ────────────────────────────────
  const [selectedProgramForTiers, setSelectedProgramForTiers] = React.useState<string>('');
  const [showTierDialog, setShowTierDialog] = React.useState(false);
  const [tierForm, setTierForm] = React.useState({ pointsRequired: 0, rewardName: '', rewardValue: '' });

  // ── Cashout State ──────────────────────────────────
  const [showCashoutDialog, setShowCashoutDialog] = React.useState(false);
  const [cashoutClient, setCashoutClient] = React.useState<string>('');
  const [cashoutProgram, setCashoutProgram] = React.useState<string>('');
  const [cashoutTier, setCashoutTier] = React.useState<string>('');

  // ── Report State ───────────────────────────────────
  const [reportProgram, setReportProgram] = React.useState<string>('');

  const openCreateProgram = () => {
    setEditingProgram(null);
    setProgramForm({ name: '', description: '', minProductPriceInCents: 100, thresholdAmountInCents: 1000, pointsPerThreshold: 1, continuousAllocation: true });
    setShowProgramDialog(true);
  };

  const openEditProgram = (p: RewardsProgram) => {
    setEditingProgram(p);
    setProgramForm({
      name: p.name, description: p.description, minProductPriceInCents: p.minProductPriceInCents,
      thresholdAmountInCents: p.thresholdAmountInCents, pointsPerThreshold: p.pointsPerThreshold,
      continuousAllocation: p.continuousAllocation,
    });
    setShowProgramDialog(true);
  };

  const saveProgram = () => {
    if (!programForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (editingProgram) {
      updateRewardsProgram(editingProgram._id, programForm);
      toast({ title: "Program updated" });
    } else {
      const p = createRewardsProgram(programForm);
      // Auto-include templates by price
      applyPriceRuleToProgram(p._id, programForm.minProductPriceInCents, templates);
      toast({ title: "Program created", description: `Included ${templates.filter(t => t.priceInCents >= programForm.minProductPriceInCents).length} products` });
    }
    setShowProgramDialog(false);
    forceUpdate();
  };

  const toggleProgramStatus = (p: RewardsProgram) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    setRewardsProgramStatus(p._id, newStatus);
    toast({ title: `Program ${newStatus}` });
    forceUpdate();
  };

  const retireProgram = (p: RewardsProgram) => {
    setRewardsProgramStatus(p._id, 'retired');
    toast({ title: "Program retired" });
    forceUpdate();
  };

  const reapplyPriceRule = (p: RewardsProgram) => {
    const included = applyPriceRuleToProgram(p._id, p.minProductPriceInCents, templates);
    toast({ title: "Products updated", description: `${included.length} products now included` });
    forceUpdate();
  };

  const saveTier = () => {
    if (!selectedProgramForTiers || !tierForm.rewardName.trim()) return;
    createRewardsTier({ programId: selectedProgramForTiers, ...tierForm });
    setShowTierDialog(false);
    setTierForm({ pointsRequired: 0, rewardName: '', rewardValue: '' });
    toast({ title: "Tier added" });
    forceUpdate();
  };

  const processCashout = () => {
    if (!cashoutClient || !cashoutProgram || !cashoutTier) return;
    const result = cashoutRewards(cashoutClient, cashoutProgram, cashoutTier, currentUser?._id || '');
    if (result) {
      toast({ title: "Cashout processed", description: `Redeemed for "${result.rewardName}"` });
    } else {
      toast({ title: "Insufficient points", variant: "destructive" });
    }
    setShowCashoutDialog(false);
    forceUpdate();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'bg-success/20 text-success', inactive: 'bg-warning/20 text-warning-foreground', retired: 'bg-muted text-muted-foreground' };
    return <Badge className={cn("text-xs", map[status] || '')}>{status}</Badge>;
  };

  // ── Report Data ────────────────────────────────────
  const reportProg = reportProgram ? programs.find(p => p._id === reportProgram) : null;
  const reportBalances = reportProgram ? getClientRewardsBalances(reportProgram) : [];
  const reportTiers = reportProgram ? getRewardsTiers(reportProgram).sort((a, b) => a.pointsRequired - b.pointsRequired) : [];
  const reportCashouts = reportProgram ? getRewardsCashouts(reportProgram) : [];

  const tierDistribution = reportTiers.map(tier => {
    const eligible = reportBalances.filter(b => b.currentPoints >= tier.pointsRequired);
    return { tier, count: eligible.length };
  });

  return (
    <PageLayout title="Rewards Programs" description="Manage loyalty programs, tiers, and client points">
      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs"><Gift className="h-4 w-4 mr-1" />Programs</TabsTrigger>
          <TabsTrigger value="tiers"><Award className="h-4 w-4 mr-1" />Rewards Table</TabsTrigger>
          <TabsTrigger value="points"><Star className="h-4 w-4 mr-1" />Client Points</TabsTrigger>
          <TabsTrigger value="cashouts"><DollarSign className="h-4 w-4 mr-1" />Cashout History</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1" />Reports</TabsTrigger>
        </TabsList>

        {/* ── Programs Tab ──────────────────────────── */}
        <TabsContent value="programs" className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={openCreateProgram}><Plus className="h-4 w-4 mr-2" />Create Program</Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {programs.map(p => (
              <Card key={p._id} className={cn(!p.isActive && "opacity-60")}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{p.description || 'No description'}</CardDescription>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Min Price:</span> <span className="font-medium">{formatPrice(p.minProductPriceInCents)}</span></div>
                    <div><span className="text-muted-foreground">Threshold:</span> <span className="font-medium">{formatPrice(p.thresholdAmountInCents)}</span></div>
                    <div><span className="text-muted-foreground">Points:</span> <span className="font-medium">{p.pointsPerThreshold} pts</span></div>
                    <div><span className="text-muted-foreground">Stacking:</span> <span className="font-medium">{p.continuousAllocation ? 'Yes' : 'No'}</span></div>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.includedTemplateIds.length} products included</div>
                  {isAdmin && p.status !== 'retired' && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => openEditProgram(p)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleProgramStatus(p)}>
                        {p.isActive ? <><Pause className="h-3 w-3 mr-1" />Pause</> : <><Play className="h-3 w-3 mr-1" />Activate</>}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => reapplyPriceRule(p)}>Refresh Products</Button>
                      <Button variant="destructive" size="sm" onClick={() => retireProgram(p)}><Archive className="h-3 w-3 mr-1" />Retire</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {programs.length === 0 && (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No rewards programs yet. Create one to get started.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ── Tiers Tab ─────────────────────────────── */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedProgramForTiers} onValueChange={setSelectedProgramForTiers}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select program..." /></SelectTrigger>
              <SelectContent>{programs.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            {isAdmin && selectedProgramForTiers && (
              <Button size="sm" onClick={() => { setTierForm({ pointsRequired: 0, rewardName: '', rewardValue: '' }); setShowTierDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Tier
              </Button>
            )}
          </div>
          {selectedProgramForTiers ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Points Required</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Value</TableHead>
                    {isAdmin && <TableHead className="w-16"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getRewardsTiers(selectedProgramForTiers).sort((a, b) => a.pointsRequired - b.pointsRequired).map(t => (
                    <TableRow key={t._id}>
                      <TableCell className="font-medium">{t.pointsRequired} pts</TableCell>
                      <TableCell>{t.rewardName}</TableCell>
                      <TableCell>{t.rewardValue}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { deleteRewardsTier(t._id); forceUpdate(); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {getRewardsTiers(selectedProgramForTiers).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tiers configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Select a program to manage its rewards table</CardContent></Card>
          )}
        </TabsContent>

        {/* ── Client Points Tab ────────────────────── */}
        <TabsContent value="points" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Client Point Balances</h3>
            <Button variant="outline" onClick={() => setShowCashoutDialog(true)}>
              <DollarSign className="h-4 w-4 mr-1" />Process Cashout
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead className="text-right">Current Points</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="text-right">Total Redeemed</TableHead>
                  <TableHead>Eligible Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const allBalances = programs.flatMap(p => getClientRewardsBalances(p._id).map(b => ({ ...b, program: p })));
                  if (allBalances.length === 0) return (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No points allocated yet</TableCell></TableRow>
                  );
                  return allBalances.map(b => {
                    const client = getClient(b.clientId);
                    const tiers = getRewardsTiers(b.programId).sort((a, c) => c.pointsRequired - a.pointsRequired);
                    const eligibleTier = tiers.find(t => b.currentPoints >= t.pointsRequired);
                    return (
                      <TableRow key={b._id}>
                        <TableCell className="font-medium">{client?.name || 'Unknown'}</TableCell>
                        <TableCell>{b.program.name}</TableCell>
                        <TableCell className="text-right font-bold">{b.currentPoints}</TableCell>
                        <TableCell className="text-right">{b.totalPointsEarned}</TableCell>
                        <TableCell className="text-right">{b.totalPointsCashedOut}</TableCell>
                        <TableCell>
                          {eligibleTier ? (
                            <Badge variant="secondary" className="bg-success/20 text-success">{eligibleTier.rewardName}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Cashout History Tab ──────────────────── */}
        <TabsContent value="cashouts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Cashout History</h3>
            <ExportMenu
              data={programs.flatMap(p => getRewardsCashouts(p._id))}
              columns={[
                { header: 'Date', accessor: (c: RewardsCashout) => new Date(c._creationTime).toLocaleString() },
                { header: 'Client', accessor: (c: RewardsCashout) => getClient(c.clientId)?.name || 'Unknown' },
                { header: 'Program', accessor: (c: RewardsCashout) => programs.find(p => p._id === c.programId)?.name || '' },
                { header: 'Reward', accessor: (c: RewardsCashout) => c.rewardName },
                { header: 'Points', accessor: (c: RewardsCashout) => String(c.pointsRedeemed) },
              ]}
              filename="cashout-history"
              title="Cashout History"
            />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead className="text-right">Points Redeemed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const allCashouts = programs.flatMap(p => getRewardsCashouts(p._id));
                  if (allCashouts.length === 0) return (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No cashouts yet</TableCell></TableRow>
                  );
                  return allCashouts.sort((a, b) => b._creationTime - a._creationTime).map(c => (
                    <TableRow key={c._id}>
                      <TableCell className="text-sm">{new Date(c._creationTime).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{getClient(c.clientId)?.name || 'Unknown'}</TableCell>
                      <TableCell>{programs.find(p => p._id === c.programId)?.name}</TableCell>
                      <TableCell><Badge variant="secondary">{c.rewardName}</Badge></TableCell>
                      <TableCell className="text-right font-bold">{c.pointsRedeemed}</TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Reports Tab ─────────────────────────── */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={reportProgram} onValueChange={setReportProgram}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select program..." /></SelectTrigger>
              <SelectContent>{programs.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            {reportProgram && (
              <ExportMenu
                data={reportBalances.map(b => {
                  const client = getClient(b.clientId);
                  const eligibleTier = reportTiers.slice().reverse().find(t => b.currentPoints >= t.pointsRequired);
                  return { clientName: client?.name || 'Unknown', currentPoints: b.currentPoints, totalEarned: b.totalPointsEarned, totalRedeemed: b.totalPointsCashedOut, tier: eligibleTier?.rewardName || 'None' };
                })}
                columns={[
                  { header: 'Client', accessor: (r: any) => r.clientName },
                  { header: 'Current Points', accessor: (r: any) => String(r.currentPoints) },
                  { header: 'Total Earned', accessor: (r: any) => String(r.totalEarned) },
                  { header: 'Total Redeemed', accessor: (r: any) => String(r.totalRedeemed) },
                  { header: 'Eligible Tier', accessor: (r: any) => r.tier },
                ]}
                filename={`rewards-report-${reportProg?.name}`}
                title={`Rewards Report — ${reportProg?.name}`}
              />
            )}
          </div>

          {reportProg ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{reportBalances.length}</div>
                    <p className="text-xs text-muted-foreground">Participants</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{reportBalances.reduce((s, b) => s + b.currentPoints, 0)}</div>
                    <p className="text-xs text-muted-foreground">Points in Circulation</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{reportBalances.reduce((s, b) => s + b.totalPointsEarned, 0)}</div>
                    <p className="text-xs text-muted-foreground">Total Points Issued</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{reportCashouts.length}</div>
                    <p className="text-xs text-muted-foreground">Total Cashouts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tier Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-base">Tier Distribution — Rewards Needed</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Points Required</TableHead>
                        <TableHead className="text-right">Eligible Clients</TableHead>
                        <TableHead className="text-right">Rewards Needed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tierDistribution.map(({ tier, count }) => (
                        <TableRow key={tier._id}>
                          <TableCell className="font-medium">{tier.rewardName}</TableCell>
                          <TableCell>{tier.pointsRequired} pts</TableCell>
                          <TableCell className="text-right">{count}</TableCell>
                          <TableCell className="text-right font-bold">{count}</TableCell>
                        </TableRow>
                      ))}
                      {tierDistribution.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No tiers configured</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Client Breakdown */}
              <Card>
                <CardHeader><CardTitle className="text-base">Client Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Current Pts</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">Total Earned</TableHead>
                        <TableHead className="text-right">Total Redeemed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportBalances.sort((a, b) => b.currentPoints - a.currentPoints).map(b => {
                        const client = getClient(b.clientId);
                        const eligibleTier = reportTiers.slice().reverse().find(t => b.currentPoints >= t.pointsRequired);
                        return (
                          <TableRow key={b._id}>
                            <TableCell className="font-medium">{client?.name || 'Unknown'}</TableCell>
                            <TableCell className="text-right font-bold">{b.currentPoints}</TableCell>
                            <TableCell>{eligibleTier ? <Badge variant="secondary">{eligibleTier.rewardName}</Badge> : '—'}</TableCell>
                            <TableCell className="text-right">{b.totalPointsEarned}</TableCell>
                            <TableCell className="text-right">{b.totalPointsCashedOut}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Select a program to view its report</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Create/Edit Program Dialog ──────────────── */}
      <Dialog open={showProgramDialog} onOpenChange={setShowProgramDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProgram ? 'Edit' : 'Create'} Rewards Program</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Program Name</Label><Input value={programForm.name} onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Points Blast" /></div>
            <div><Label>Description</Label><Input value={programForm.description} onChange={e => setProgramForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Product Price ($)</Label>
                <Input type="number" min={1} step={0.01} value={(programForm.minProductPriceInCents / 100).toFixed(2)} onChange={e => setProgramForm(f => ({ ...f, minProductPriceInCents: Math.round(parseFloat(e.target.value || '1') * 100) }))} />
                <p className="text-xs text-muted-foreground mt-1">Products at or above this price are included</p>
              </div>
              <div>
                <Label>Spending Threshold ($)</Label>
                <Input type="number" min={1} step={0.01} value={(programForm.thresholdAmountInCents / 100).toFixed(2)} onChange={e => setProgramForm(f => ({ ...f, thresholdAmountInCents: Math.round(parseFloat(e.target.value || '1') * 100) }))} />
                <p className="text-xs text-muted-foreground mt-1">Spend this much to earn points</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Points Per Threshold</Label>
                <Input type="number" min={1} value={programForm.pointsPerThreshold} onChange={e => setProgramForm(f => ({ ...f, pointsPerThreshold: parseInt(e.target.value || '1') }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={programForm.continuousAllocation} onCheckedChange={v => setProgramForm(f => ({ ...f, continuousAllocation: v }))} />
                <Label>Continuous Allocation</Label>
              </div>
            </div>
            {programForm.continuousAllocation && (
              <Card className="bg-muted/50"><CardContent className="p-3 text-xs text-muted-foreground">
                Example: If threshold is {formatPrice(programForm.thresholdAmountInCents)} for {programForm.pointsPerThreshold} pts, a customer spending $59 earns {Math.floor(5900 / programForm.thresholdAmountInCents) * programForm.pointsPerThreshold} pts.
              </CardContent></Card>
            )}
            <p className="text-xs text-muted-foreground">
              {templates.filter(t => t.priceInCents >= programForm.minProductPriceInCents).length} / {templates.length} products will be included at this price threshold.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgramDialog(false)}>Cancel</Button>
            <Button onClick={saveProgram}>{editingProgram ? 'Save Changes' : 'Create Program'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Tier Dialog ────────────────────────── */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Reward Tier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Points Required</Label><Input type="number" min={1} value={tierForm.pointsRequired} onChange={e => setTierForm(f => ({ ...f, pointsRequired: parseInt(e.target.value || '0') }))} /></div>
            <div><Label>Reward Name</Label><Input value={tierForm.rewardName} onChange={e => setTierForm(f => ({ ...f, rewardName: e.target.value }))} placeholder="e.g. Pen, $100 Cash" /></div>
            <div><Label>Reward Value</Label><Input value={tierForm.rewardValue} onChange={e => setTierForm(f => ({ ...f, rewardValue: e.target.value }))} placeholder="e.g. $5.00, Special Item" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierDialog(false)}>Cancel</Button>
            <Button onClick={saveTier}>Add Tier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cashout Dialog ─────────────────────────── */}
      <Dialog open={showCashoutDialog} onOpenChange={setShowCashoutDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process Points Cashout</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Program</Label>
              <Select value={cashoutProgram} onValueChange={v => { setCashoutProgram(v); setCashoutClient(''); setCashoutTier(''); }}>
                <SelectTrigger><SelectValue placeholder="Select program..." /></SelectTrigger>
                <SelectContent>{programs.filter(p => p.isActive).map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {cashoutProgram && (
              <div>
                <Label>Client</Label>
                <Select value={cashoutClient} onValueChange={setCashoutClient}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    {getClientRewardsBalances(cashoutProgram).map(b => {
                      const client = getClient(b.clientId);
                      return <SelectItem key={b.clientId} value={b.clientId}>{client?.name} — {b.currentPoints} pts</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            {cashoutClient && cashoutProgram && (() => {
              const balance = getClientRewardsBalances(cashoutProgram, cashoutClient)[0];
              const availableTiers = getRewardsTiers(cashoutProgram).filter(t => balance && balance.currentPoints >= t.pointsRequired).sort((a, b) => b.pointsRequired - a.pointsRequired);
              return (
                <div>
                  <Label>Redeem For (Current: {balance?.currentPoints || 0} pts)</Label>
                  <Select value={cashoutTier} onValueChange={setCashoutTier}>
                    <SelectTrigger><SelectValue placeholder="Select reward..." /></SelectTrigger>
                    <SelectContent>
                      {availableTiers.map(t => <SelectItem key={t._id} value={t._id}>{t.rewardName} ({t.pointsRequired} pts)</SelectItem>)}
                      {availableTiers.length === 0 && <SelectItem value="_none" disabled>Not enough points</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashoutDialog(false)}>Cancel</Button>
            <Button onClick={processCashout} disabled={!cashoutClient || !cashoutProgram || !cashoutTier}>Process Cashout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
