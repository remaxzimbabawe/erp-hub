import * as React from "react";
import { PageHeader, EmptyState } from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExportMenu } from "@/components/common/ExportMenu";
import { useAuth } from "@/lib/auth";
import { getShops, getUserShopAssignments } from "@/lib/database";
import {
  REPORT_CATALOG,
  generateReport,
  type ReportRequest,
  type ReportType,
} from "@/lib/reports";
import {
  FileText,
  FileBarChart,
  Package,
  DollarSign,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const REPORTS_KEY = "erp_generated_reports";

function loadReports(): ReportRequest[] {
  try {
    const stored = localStorage.getItem(REPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveReports(reports: ReportRequest[]) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

const requestSchema = z.object({
  type: z.string().min(1, "Please select a report type"),
  shopId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
type RequestForm = z.infer<typeof requestSchema>;

const GROUP_ICONS: Record<string, React.ReactNode> = {
  Financial: <DollarSign className="h-4 w-4" />,
  Sales: <FileBarChart className="h-4 w-4" />,
  Inventory: <Package className="h-4 w-4" />,
  "Stock Transfers": <ArrowLeftRight className="h-4 w-4" />,
  Customer: <Users className="h-4 w-4" />,
  "Product Performance": <TrendingUp className="h-4 w-4" />,
};

export default function ReportsPage() {
  const { currentUser, getUserRole, getUserShopIds } = useAuth();
  const { toast } = useToast();
  const role = getUserRole();
  const shops = getShops();
  const userShopIds = getUserShopIds();

  const [reports, setReports] = React.useState<ReportRequest[]>(loadReports);
  const [viewingReport, setViewingReport] = React.useState<ReportRequest | null>(null);
  const [showNewDialog, setShowNewDialog] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("catalog");

  // Shop filter for shop_manager
  const availableShops =
    role === "shop_manager"
      ? shops.filter((s) => userShopIds.includes(s._id))
      : shops;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { type: "", shopId: "", dateFrom: "", dateTo: "" },
  });

  const onGenerate = (values: RequestForm) => {
    const catalogItem = REPORT_CATALOG.find((c) => c.type === values.type);
    if (!catalogItem) return;

    const shopFilter =
      role === "shop_manager" && userShopIds.length === 1
        ? userShopIds[0]
        : values.shopId || undefined;
    const dateFrom = values.dateFrom ? new Date(values.dateFrom).getTime() : undefined;
    const dateTo = values.dateTo
      ? new Date(values.dateTo).setHours(23, 59, 59, 999)
      : undefined;

    const result = generateReport(
      values.type as ReportType,
      shopFilter,
      dateFrom,
      dateTo
    );

    const shopName = shopFilter ? shops.find((s) => s._id === shopFilter)?.name : "All Shops";

    const report: ReportRequest = {
      _id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      _creationTime: Date.now(),
      type: values.type as ReportType,
      title: `${catalogItem.label} — ${shopName}`,
      shopId: shopFilter,
      dateFrom,
      dateTo: dateTo as number | undefined,
      status: "ready",
      requestedBy: currentUser?.name || "Unknown",
      data: result.data,
      columns: result.columns,
      summary: result.summary,
    };

    const updated = [report, ...reports];
    setReports(updated);
    saveReports(updated);
    setShowNewDialog(false);
    reset();
    setActiveTab("history");
    toast({ title: "Report generated", description: `${catalogItem.label} is ready to view.` });
  };

  const deleteReport = (id: string) => {
    const updated = reports.filter((r) => r._id !== id);
    setReports(updated);
    saveReports(updated);
    toast({ title: "Report deleted" });
  };

  const groupedCatalog = REPORT_CATALOG.reduce(
    (acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      // Filter: shop_manager cannot see Financial reports
      if (role === "shop_manager" && item.group === "Financial") return acc;
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, typeof REPORT_CATALOG>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate, view, and export business reports">
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Generate Report
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog">Report Catalog</TabsTrigger>
          <TabsTrigger value="history">
            Generated Reports
            {reports.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {reports.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Catalog ── */}
        <TabsContent value="catalog" className="space-y-6 mt-4">
          {Object.entries(groupedCatalog).map(([group, items]) =>
            items.length > 0 ? (
              <div key={group} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  {GROUP_ICONS[group]} {group} Reports
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <Card
                      key={item.type}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => {
                        reset({ type: item.type, shopId: "", dateFrom: "", dateTo: "" });
                        setShowNewDialog(true);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{item.label}</CardTitle>
                        <CardDescription className="text-xs">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-xs">
                          {item.group}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="mt-4">
          {reports.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No reports yet"
              description="Generate your first report from the catalog."
              action={
                <Button onClick={() => setActiveTab("catalog")} variant="outline">
                  Browse Catalog
                </Button>
              }
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r._creationTime).toLocaleString()}
                        </TableCell>
                        <TableCell>{r.requestedBy}</TableCell>
                        <TableCell>{r.data.length}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.status === "ready" ? "default" : "secondary"}
                            className="gap-1"
                          >
                            {r.status === "ready" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => setViewingReport(r)}
                            >
                              <Eye className="h-3 w-3" /> View
                            </Button>
                            <ExportMenu
                              data={r.data}
                              columns={r.columns}
                              title={r.title}
                              filename={`report_${r.type}_${new Date(r._creationTime).toISOString().slice(0, 10)}`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteReport(r._id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Generate Dialog ── */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Select the report type and optional filters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_CATALOG.filter(
                        (c) => !(role === "shop_manager" && c.group === "Financial")
                      ).map((c) => (
                        <SelectItem key={c.type} value={c.type}>
                          {c.group} — {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            {availableShops.length > 1 && (
              <div className="space-y-2">
                <Label>Shop (optional)</Label>
                <Controller
                  name="shopId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All shops" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shops</SelectItem>
                        {availableShops.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Controller
                  name="dateFrom"
                  control={control}
                  render={({ field }) => (
                    <Input type="date" {...field} />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Controller
                  name="dateTo"
                  control={control}
                  render={({ field }) => (
                    <Input type="date" {...field} />
                  )}
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2">
              <FileBarChart className="h-4 w-4" />
              Generate Report
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Report Dialog ── */}
      <Dialog
        open={!!viewingReport}
        onOpenChange={(o) => !o && setViewingReport(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          {viewingReport && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>{viewingReport.title}</DialogTitle>
                    <DialogDescription>
                      Generated on{" "}
                      {new Date(viewingReport._creationTime).toLocaleString()} ·{" "}
                      {viewingReport.data.length} records
                    </DialogDescription>
                  </div>
                  <ExportMenu
                    data={viewingReport.data}
                    columns={viewingReport.columns}
                    title={viewingReport.title}
                    filename={`report_${viewingReport.type}`}
                  />
                </div>
              </DialogHeader>

              {/* Summary cards */}
              {viewingReport.summary && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                  {Object.entries(viewingReport.summary).map(([key, val]) => (
                    <Card key={key}>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">{key}</p>
                        <p className="text-lg font-bold">{val}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Data table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {viewingReport.columns.map((col, i) => (
                        <TableHead key={i}>{col.header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingReport.data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={viewingReport.columns.length}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No data for this report.
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewingReport.data.map((row, ri) => (
                        <TableRow key={ri}>
                          {viewingReport.columns.map((col, ci) => (
                            <TableCell key={ci}>{col.accessor(row)}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
