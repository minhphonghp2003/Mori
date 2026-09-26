export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-slate-100 flex justify-center">
      <div className="w-full max-w-md min-h-dvh bg-white flex flex-col sm:shadow-xl sm:border-x sm:border-slate-100">
        {children}
      </div>
    </div>
  );
}
