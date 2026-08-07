import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TableSkeleton({ rows = 5 }) {
  return (
    <div className="mt-4 bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Skeleton className="h-10 w-full max-w-[300px] rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl hidden sm:block" />
      </div>
      
      {/* Table structure skeleton */}
      <div className="flex flex-col w-full overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="flex items-center gap-4 p-4 border-b border-border/50 bg-muted/20">
            <Skeleton className="h-4 w-14 rounded-md shrink-0" />
            <div className="flex-1"><Skeleton className="h-4 w-24 rounded-md" /></div>
            <div className="flex-1"><Skeleton className="h-4 w-20 rounded-md" /></div>
            <div className="flex-1"><Skeleton className="h-4 w-16 rounded-md" /></div>
            <div className="flex-1"><Skeleton className="h-4 w-20 rounded-md" /></div>
            <div className="w-32 shrink-0 flex items-center gap-2">
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
          
          {/* Data rows */}
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50 last:border-0 hover:bg-muted/5 transition-colors">
              <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
              
              <div className="flex flex-col gap-2.5 flex-1">
                <Skeleton className="h-4 w-[60%] rounded-md" />
                <Skeleton className="h-3 w-[40%] rounded-md" />
              </div>
              
              <div className="flex flex-col gap-2.5 flex-1">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>

              <div className="flex-1">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              <div className="flex-1">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              
              <div className="flex items-center justify-end gap-2 w-32 shrink-0">
                <Skeleton className="h-9 w-14 rounded-xl" />
                <Skeleton className="h-9 w-14 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
