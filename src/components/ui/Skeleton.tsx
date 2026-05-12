import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 space-y-4 shadow-soft">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 py-12 px-6">
      <div className="flex items-center gap-6">
        <Skeleton className="h-20 w-20 rounded-[2rem]" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      <Skeleton className="h-80 w-full rounded-[3.5rem]" />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-[3rem]" />
        <Skeleton className="h-64 rounded-[3rem]" />
      </div>
    </div>
  );
}
