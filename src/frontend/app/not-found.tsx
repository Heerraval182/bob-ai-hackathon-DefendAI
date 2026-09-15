import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <p className="text-5xl font-bold text-slate-200 mb-4">404</p>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">Equipment not found</h2>
      <p className="text-sm text-slate-500 mb-6">The requested resource does not exist.</p>
      <Link href="/" className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors">
        Back to Dashboard
      </Link>
    </div>
  );
}
