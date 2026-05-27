import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <img src="/logo.png" alt="Queno" className="h-9 w-auto brightness-0 invert" />
            </div>
            <p className="text-sm text-[#94a3b8]">
              AI-native Runtime Application Self-Protection for regulated Canadian workloads.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-[#94a3b8]">
              {[["Features", "/features"], ["Security", "/security"], ["Pricing", "/pricing"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Compliance</h4>
            <ul className="space-y-2 text-sm text-[#94a3b8]">
              {["PIPEDA", "Loi 25 (Québec)", "PHIPA (Ontario)", "SOC 2 Type II (roadmap)"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-[#94a3b8]">
              {[["Contact", "/contact"], ["Sign in", "/login"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94a3b8]">
          <p>© {new Date().getFullYear()} Queno. Built in Canada.</p>
          <div className="flex gap-4">
            <Link href="/security" className="hover:text-white">Privacy Policy</Link>
            <Link href="/security" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
