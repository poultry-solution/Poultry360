import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                <Image
                  src="/icons/footer-logo.png"
                  alt="Poultry360 icon"
                  fill
                  sizes="48px"
                  quality={100}
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-bold">Poultry360</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Transforming poultry farming with smart technology. From broiler management to comprehensive farm solutions, 
              we help farmers succeed in the modern agricultural landscape.
            </p>
            <p className="mb-3 text-sm font-medium text-gray-400">Follow us</p>
            <div className="flex items-center gap-3">
              {/* Official brand colours so people know each app at a glance. */}
              <a
                href="https://www.facebook.com/profile.php?id=61576337795284"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Poultry360 on Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2] transition-transform hover:scale-110"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="#fff">
                  <path d="M15.12 5.32H17V2.14A26.1 26.1 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.03.28-1.73 1.76-1.73z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/poultry.360/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Poultry360 on Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:scale-110"
                style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)" }}
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.4" cy="6.6" r="1.1" fill="#fff" stroke="none" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@poultry.360"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Poultry360 on TikTok"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black ring-1 ring-white/15 transition-transform hover:scale-110"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                  <path transform="translate(-0.7 -0.7)" fill="#25F4EE" d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  <path transform="translate(0.7 0.7)" fill="#FE2C55" d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  <path fill="#fff" d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-gray-300 hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/#contact" className="text-gray-300 hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/about-us" className="text-gray-300 hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="text-gray-300 hover:text-primary transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Solutions</h3>
            <ul className="space-y-3">
              <li><Link href="/broiler-farm-software" className="text-gray-300 hover:text-primary transition-colors">Broiler Management</Link></li>
              <li><Link href="/layer-farm-software" className="text-gray-300 hover:text-primary transition-colors">Layer Farming</Link></li>
              <li><Link href="/hatchery-software" className="text-gray-300 hover:text-primary transition-colors">Hatchery Operations</Link></li>
              <li><Link href="/feed-dealer-software" className="text-gray-300 hover:text-primary transition-colors">Feed Distribution</Link></li>
              <li><a href="#" className="text-gray-300 hover:text-primary transition-colors">Farm Analytics</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2026 Poultry360. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-primary text-sm transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-primary text-sm transition-colors">Terms and Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
