import { Clock, Gamepad2, Shield, Target, Zap } from "lucide-react";
import { motion } from "motion/react";
import type { Page } from "../App";
import { ResourceType } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onNavigate: (page: Page, gameType?: ResourceType) => void;
}

const GAMES = [
  {
    type: ResourceType.poolTable,
    icon: "🎱",
    title: "8 Ball Pool",
    desc: "Premium quality pool tables with professional-grade cloth and accessories.",
    priceHr: 80,
    priceHalf: 50,
    color: "secondary",
  },
  {
    type: ResourceType.ps4Console,
    icon: "🎮",
    title: "PS4 Gaming",
    desc: "Latest PS4 titles with DualShock controllers and 4K displays.",
    priceHr: 60,
    priceHalf: 40,
    color: "primary",
  },
  {
    type: ResourceType.ps5Console,
    icon: "🕹️",
    title: "PS5 Zone",
    desc: "Next-gen gaming with haptic feedback DualSense and 120fps support.",
    priceHr: 100,
    priceHalf: 60,
    color: "accent",
  },
];

const FEATURES = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Real-time Availability",
    desc: "Live slot updates — see open tables the moment they free up.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "No Double Booking",
    desc: "Atomic slot reservation prevents conflicts every single time.",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Instant Confirmation",
    desc: "Your booking is locked in seconds with a unique booking ID.",
  },
];

export default function HomePage({ onNavigate }: Props) {
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const isAuthenticated = !!identity;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            type="button"
            data-ocid="nav.home.link"
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 text-xl font-black tracking-wider"
          >
            <Gamepad2 className="w-7 h-7 text-primary" />
            <span className="text-foreground">GAME</span>
            <span className="text-primary">ZONE</span>
          </button>

          <nav className="hidden md:flex items-center gap-6">
            <button
              type="button"
              data-ocid="nav.bookings.link"
              onClick={() => onNavigate("myBookings")}
              className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium uppercase tracking-wide"
            >
              My Bookings
            </button>
            <button
              type="button"
              data-ocid="nav.admin.link"
              onClick={() => onNavigate("admin")}
              className="text-muted-foreground hover:text-accent transition-colors text-sm font-medium uppercase tracking-wide"
            >
              Admin
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:block text-xs text-muted-foreground">
                  {identity?.getPrincipal().toString().slice(0, 8)}…
                </span>
                <button
                  type="button"
                  data-ocid="nav.logout.button"
                  onClick={clear}
                  className="btn-secondary text-xs py-1.5"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                data-ocid="nav.login.button"
                onClick={login}
                disabled={isLoggingIn}
                className="btn-primary text-xs py-1.5"
              >
                {isLoggingIn ? "Connecting…" : "Login"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-36 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="section-title mb-6"
          >
            🎮 Hyderabad's #1 Gaming Parlour
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground leading-none tracking-tight mb-6"
          >
            <span className="block">PLAY.</span>
            <span className="block text-primary glow-text-cyan">WIN.</span>
            <span className="block">REPEAT.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto"
          >
            Book PS5, PS4 or Pool tables in seconds. Real-time slots, zero
            double-bookings, instant confirmation.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              type="button"
              data-ocid="hero.book_slot.primary_button"
              onClick={() => onNavigate("booking", ResourceType.ps5Console)}
              className="btn-primary px-10 py-3 text-base"
            >
              🎮 BOOK YOUR SLOT
            </button>
            <button
              type="button"
              data-ocid="hero.view_bookings.secondary_button"
              onClick={() => onNavigate("myBookings")}
              className="btn-secondary px-10 py-3 text-base"
            >
              VIEW MY BOOKINGS
            </button>
          </motion.div>
        </div>
      </section>

      {/* Game Cards */}
      <section className="py-20 px-4" id="games">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-title">— Choose Your Battle —</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight">
              CHOOSE YOUR GAME
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GAMES.map((game, i) => (
              <motion.div
                key={game.type}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                data-ocid={`games.item.${i + 1}`}
                className="neon-card p-6 flex flex-col items-center text-center group cursor-pointer"
                onClick={() => onNavigate("booking", game.type)}
              >
                <div
                  className="text-6xl mb-4 animate-float"
                  style={{ animationDelay: `${i * 0.5}s` }}
                >
                  {game.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {game.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {game.desc}
                </p>
                <div className="mb-6">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Starting from
                  </span>
                  <div className="text-2xl font-black text-primary">
                    ₹{game.priceHalf}
                    <span className="text-sm font-normal text-muted-foreground">
                      /30 min
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ₹{game.priceHr}/hr
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid={`games.select.button.${i + 1}`}
                  className="btn-primary w-full text-xs py-2"
                >
                  SELECT GAME →
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-title">— Why GameZone —</p>
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">
              BUILT TO RUN YOUR GAME
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="neon-card p-6"
              >
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Steps */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="section-title">— Dead Simple —</p>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tight mb-12">
            BOOK IN 4 STEPS
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {["Select Game", "Pick Time", "Pay", "Play!"].map((step, i) => (
              <div key={step} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center text-primary font-black text-lg mb-2 shadow-neon-cyan">
                    {i + 1}
                  </div>
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide whitespace-nowrap">
                    {step}
                  </span>
                </div>
                {i < 3 && (
                  <div className="hidden md:block w-12 h-px bg-primary/40" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-10">
            <button
              type="button"
              data-ocid="steps.book_now.primary_button"
              onClick={() => onNavigate("booking", ResourceType.ps5Console)}
              className="btn-primary px-12 py-3 text-base"
            >
              START BOOKING
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="font-black tracking-wider">GAMEZONE</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>PS5 Gaming</span>
            <span>PS4 Gaming</span>
            <span>8 Ball Pool</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
