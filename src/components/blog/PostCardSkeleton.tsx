export default function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
          <div className="h-4 w-16 bg-gray-100 rounded" />
        </div>
        <div className="h-6 bg-gray-100 rounded w-full mb-2" />
        <div className="h-6 bg-gray-100 rounded w-3/4 mb-4" />
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-50 rounded w-full" />
          <div className="h-4 bg-gray-50 rounded w-5/6" />
          <div className="h-4 bg-gray-50 rounded w-2/3" />
        </div>
        <div className="h-3 w-24 bg-gray-50 rounded" />
      </div>
    </div>
  );
}

export function FeaturedPostSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-16 bg-emerald-100 rounded" />
          <div className="h-5 w-24 bg-gray-100 rounded-full" />
        </div>
        <div className="h-8 bg-gray-100 rounded w-full mb-2" />
        <div className="h-8 bg-gray-100 rounded w-3/4 mb-3" />
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-50 rounded w-full" />
          <div className="h-4 bg-gray-50 rounded w-5/6" />
        </div>
        <div className="flex gap-3">
          <div className="h-4 w-20 bg-gray-50 rounded" />
          <div className="h-4 w-20 bg-gray-50 rounded" />
        </div>
      </div>
    </div>
  );
}
