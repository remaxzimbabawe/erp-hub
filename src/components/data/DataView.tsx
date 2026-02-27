import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutGrid, 
  List, 
  MoreHorizontal, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "grid" | "list";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataViewProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  searchPlaceholder?: string;
  searchKeys?: string[];
  viewModes?: ViewMode[];
  defaultView?: ViewMode;
  renderGridItem?: (item: T) => React.ReactNode;
  renderListItem?: (item: T) => React.ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

export function DataView<T>({
  data,
  columns,
  keyExtractor,
  onView,
  onEdit,
  onDelete,
  searchPlaceholder = "Search...",
  searchKeys = [],
  viewModes = ["table", "grid", "list"],
  defaultView = "table",
  renderGridItem,
  renderListItem,
  pageSize = 10,
  emptyMessage = "No data found",
  className,
}: DataViewProps<T>) {
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultView);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchQuery || searchKeys.length === 0) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(item => {
      const record = item as Record<string, unknown>;
      return searchKeys.some(key => {
        const value = record[key];
        return value && String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchKeys]);

  // Paginate data
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const hasActions = onView || onEdit || onDelete;

  const renderActions = (item: T) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={() => onView(item)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem 
            onClick={() => onDelete(item)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const getCellValue = (item: T, key: string): React.ReactNode => {
    const record = item as Record<string, unknown>;
    const value = record[key];
    if (value === null || value === undefined) return '';
    return String(value);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full sm:w-[300px]"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {viewModes.map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode(mode)}
              className="h-9 w-9"
            >
              {mode === "table" && <List className="h-4 w-4" />}
              {mode === "grid" && <LayoutGrid className="h-4 w-4" />}
              {mode === "list" && <List className="h-4 w-4 rotate-90" />}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {paginatedData.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.header}
                  </TableHead>
                ))}
                {hasActions && <TableHead className="w-[70px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={keyExtractor(item)} className="hover:bg-muted/50">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render 
                        ? col.render(item) 
                        : getCellValue(item, col.key)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell>{renderActions(item)}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedData.map((item) => (
            <Card key={keyExtractor(item)} className="overflow-hidden hover:shadow-md transition-shadow">
              {renderGridItem ? (
                renderGridItem(item)
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      {columns.slice(0, 3).map((col) => (
                        <p key={col.key} className="text-sm">
                          <span className="text-muted-foreground">{col.header}: </span>
                          {col.render 
                            ? col.render(item) 
                            : getCellValue(item, col.key)}
                        </p>
                      ))}
                    </div>
                    {hasActions && renderActions(item)}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedData.map((item) => (
            <Card key={keyExtractor(item)} className="overflow-hidden hover:shadow-md transition-shadow">
              {renderListItem ? (
                renderListItem(item)
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6 flex-1">
                      {columns.map((col) => (
                        <div key={col.key} className="min-w-0">
                          <p className="text-xs text-muted-foreground">{col.header}</p>
                          <p className="text-sm truncate">
                            {col.render 
                              ? col.render(item) 
                              : getCellValue(item, col.key)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {hasActions && renderActions(item)}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
            {filteredData.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
