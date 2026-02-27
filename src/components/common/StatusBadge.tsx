import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "default";
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const variants = {
    success: "bg-success/10 text-success border-success/20 hover:bg-success/20",
    warning: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
    error: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
    info: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
    default: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn(variants[status], className)}>
      {children}
    </Badge>
  );
}

interface QuantityBadgeProps {
  quantity: number;
  lowThreshold?: number;
  className?: string;
}

export function QuantityBadge({ quantity, lowThreshold = 5, className }: QuantityBadgeProps) {
  const status = quantity <= 0 ? "error" : quantity <= lowThreshold ? "warning" : "success";
  const label = quantity <= 0 ? "Out of Stock" : quantity <= lowThreshold ? "Low Stock" : "In Stock";
  
  return (
    <StatusBadge status={status} className={className}>
      {label} ({quantity})
    </StatusBadge>
  );
}
