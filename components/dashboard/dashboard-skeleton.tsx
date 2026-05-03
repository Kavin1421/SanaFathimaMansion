import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-12 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="col-span-12 rounded-2xl border border-slate-200/50 p-8 dark:border-slate-800/80">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full rounded-2xl sm:w-40" />
            <Skeleton className="h-16 w-full rounded-2xl sm:w-40" />
            <Skeleton className="h-16 w-full rounded-2xl sm:w-40" />
          </div>
        </div>
      </div>

      <div className="col-span-12 space-y-2">
        <Skeleton className="h-11 w-full max-w-xl rounded-full" />
        <Skeleton className="h-11 w-full max-w-lg rounded-full" />
      </div>

      <div className="col-span-12 rounded-2xl border border-slate-200/50 p-8 dark:border-slate-800/80">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-4 w-64" />
        <Skeleton className="mt-8 h-[300px] w-full rounded-xl" />
      </div>

      <div className="col-span-12 rounded-2xl border border-slate-200/50 p-8 md:col-span-6 dark:border-slate-800/80">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-8 mx-auto h-[300px] max-w-[320px] rounded-full" />
      </div>

      <div className="col-span-12 rounded-2xl border border-slate-200/50 p-8 md:col-span-6 dark:border-slate-800/80">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-8 h-[280px] w-full rounded-xl" />
      </div>

      <div className="col-span-12 rounded-2xl border border-slate-200/50 p-8 dark:border-slate-800/80">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-24 w-full rounded-xl" />
        <Skeleton className="mt-3 h-24 w-full rounded-xl" />
      </div>

      <div className="col-span-12 rounded-2xl border border-slate-200/50 p-8 dark:border-slate-800/80">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
