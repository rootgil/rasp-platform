import Link from "next/link";
import { Shield } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0f172a] text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#2563eb]">
                <Shield size={14} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-sm font-bold">RASP Platform</span>
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
          <p>© {new Date().getFullYear()} RASP Platform. Built in Canada 🍁</p>
          <div className="flex gap-4">
            <Link href="/security" className="hover:text-white">Privacy Policy</Link>
            <Link href="/security" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
