import { CalendarDays, ChevronLeft, Loader2, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { type Booking, BookingStatus, ResourceType } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onNavigate: (page: Page) => void;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  [BookingStatus.confirmed]:
    "text-secondary border-secondary/60 bg-secondary/10",
  [BookingStatus.pending]: "text-primary border-primary/60 bg-primary/10",
  [BookingStatus.completed]: "text-muted-foreground border-border bg-muted/30",
  [BookingStatus.cancelled]:
    "text-destructive border-destructive/60 bg-destructive/10",
};

const GAME_ICONS: Record<string, string> = {
  poolTable: "🎱",
  ps4Console: "🎮",
  ps5Console: "🕹️",
};

export default function MyBookingsPage({ onNavigate }: Props) {
  const { actor } = useActor();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<bigint | null>(null);

  useEffect(() => {
    if (!actor || !identity) return;
    setLoading(true);
    actor
      .getUserBookings(identity.getPrincipal())
      .then(setBookings)
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [actor, identity]);

  const handleCancel = async (bookingId: bigint) => {
    if (!actor) return;
    setCancellingId(bookingId);
    try {
      const updated = await actor.cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b)),
      );
      toast.success("Booking cancelled.");
    } catch {
      toast.error("Failed to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) =>
      b.status !== BookingStatus.cancelled &&
      b.status !== BookingStatus.completed &&
      Number(b.startTime / 1_000_000n) >= now,
  );
  const past = bookings.filter(
    (b) =>
      b.status === BookingStatus.cancelled ||
      b.status === BookingStatus.completed ||
      Number(b.startTime / 1_000_000n) < now,
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            data-ocid="mybookings.back.link"
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          <div className="font-black text-lg tracking-wider text-foreground">
            MY BOOKINGS
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {!isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="neon-card p-12 text-center"
            data-ocid="mybookings.auth.card"
          >
            <CalendarDays className="w-16 h-16 text-accent mx-auto mb-4 opacity-60" />
            <h2 className="text-2xl font-black text-foreground mb-3">
              LOGIN REQUIRED
            </h2>
            <p className="text-muted-foreground mb-6">
              Login to view and manage your bookings.
            </p>
            <button
              type="button"
              data-ocid="mybookings.login.primary_button"
              onClick={login}
              disabled={isLoggingIn}
              className="btn-primary px-10 py-3"
            >
              {isLoggingIn ? "Connecting…" : "LOGIN NOW"}
            </button>
          </motion.div>
        ) : loading ? (
          <div
            className="flex justify-center py-24"
            data-ocid="mybookings.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="neon-card p-12 text-center"
            data-ocid="mybookings.empty_state"
          >
            <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-2xl font-black text-foreground mb-3">
              NO BOOKINGS YET
            </h2>
            <p className="text-muted-foreground mb-6">
              Book a session to see it here.
            </p>
            <button
              type="button"
              data-ocid="mybookings.book_now.primary_button"
              onClick={() => onNavigate("booking")}
              className="btn-primary px-10 py-3"
            >
              BOOK NOW
            </button>
          </motion.div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-10">
                <h3 className="section-title mb-4">UPCOMING</h3>
                <div className="space-y-4">
                  {upcoming.map((b, i) => (
                    <BookingCard
                      key={String(b.id)}
                      booking={b}
                      index={i + 1}
                      onCancel={handleCancel}
                      cancellingId={cancellingId}
                    />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h3 className="section-title mb-4">PAST & CANCELLED</h3>
                <div className="space-y-4">
                  {past.map((b, i) => (
                    <BookingCard
                      key={String(b.id)}
                      booking={b}
                      index={i + 1}
                      onCancel={handleCancel}
                      cancellingId={cancellingId}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  index,
  onCancel,
  cancellingId,
}: {
  booking: Booking;
  index: number;
  onCancel: (id: bigint) => void;
  cancellingId: bigint | null;
}) {
  const isCancelling = cancellingId === booking.id;
  const canCancel =
    booking.status !== BookingStatus.cancelled &&
    booking.status !== BookingStatus.completed;
  const slotDate = new Date(Number(booking.startTime / 1_000_000n));
  const icon = GAME_ICONS[booking.resourceType as string] ?? "🎮";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      data-ocid={`mybookings.item.${index}`}
      className="neon-card p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="font-bold text-foreground">
              {booking.resourceName}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {slotDate.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              at{" "}
              {slotDate.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
              {" · "}
              {String(booking.durationMins)} mins
            </p>
            <p className="text-xs text-muted-foreground">
              Booking #{String(booking.id)}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full border capitalize ${STATUS_COLORS[booking.status]}`}
          >
            {booking.status}
          </span>
          <p className="text-sm font-bold text-primary mt-2">
            ₹{String(booking.totalAmount)}
          </p>
        </div>
      </div>
      {canCancel && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            data-ocid={`mybookings.cancel.delete_button.${index}`}
            onClick={() => onCancel(booking.id)}
            disabled={isCancelling}
            className="flex items-center gap-2 text-xs text-destructive border border-destructive/40 rounded-full px-3 py-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-60"
          >
            {isCancelling ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {isCancelling ? "Cancelling…" : "Cancel Booking"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
