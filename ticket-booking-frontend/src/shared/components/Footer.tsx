import { Container } from "./Container";
import { Ticket } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A] bg-[#0A0A0A] py-20">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Ticket className="w-6 h-6 text-blue-500" />
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                TK-AWS
              </span>
            </div>
            <p className="text-sm text-[#A3A3A3] leading-relaxed max-w-xs">
              Your premium destination for live events. Discover, book, and
              experience the world's best football matches, concerts, and
              entertainment.
            </p>
            <div className="flex gap-3 pt-2">
              {["Facebook", "Twitter", "Instagram", "YouTube"].map((social) => (
                <a
                  key={social}
                  href="#"
                  aria-label={social}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#151515] border border-[#2A2A2A] text-[#A3A3A3] hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                >
                  <SocialIcon name={social} />
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4
              className="font-semibold mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Company
            </h4>
            <ul className="flex flex-col gap-3.5">
              {["About Us", "Careers", "Press", "Blog", "Partners"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-[#A3A3A3] hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Events */}
          <div>
            <h4
              className="font-semibold mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Events
            </h4>
            <ul className="flex flex-col gap-3.5">
              {["Football", "Concerts", "Sports", "Theatre", "Comedy"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-[#A3A3A3] hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4
              className="font-semibold mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Support
            </h4>
            <ul className="flex flex-col gap-3.5">
              {[
                "Help Center",
                "Contact Us",
                "Refund Policy",
                "FAQs",
                "Community",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-sm text-[#A3A3A3] hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[#2A2A2A] text-xs text-[#6B6B6B]">
          <p>&copy; {new Date().getFullYear()} TK-AWS. All rights reserved.</p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
              (item) => (
                <a
                  key={item}
                  href="#"
                  className="hover:text-[#A3A3A3] transition-colors"
                >
                  {item}
                </a>
              )
            )}
          </div>
        </div>
      </Container>
    </footer>
  );
}

/* Simple SVG social icons */
function SocialIcon({ name }: { name: string }) {
  const size = 18;
  switch (name) {
    case "Facebook":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "Twitter":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "Instagram":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case "YouTube":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    default:
      return null;
  }
}
