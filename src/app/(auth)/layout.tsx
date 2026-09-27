export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-slate-100 dark:bg-slate-950 flex justify-center">
      <div className="w-full max-w-md min-h-dvh bg-white dark:bg-slate-900 flex flex-col sm:shadow-xl sm:border-x sm:border-slate-100 dark:sm:border-slate-800">
        {children}
      </div>
    </div>
  );
}
