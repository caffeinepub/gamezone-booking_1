import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import {
  type Booking,
  PaymentMethod,
  type Resource,
  ResourceType,
} from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  selectedGameType: ResourceType;
  onNavigate: (page: Page, gameType?: ResourceType) => void;
}

const GAME_LABELS: Record<ResourceType, { label: string; icon: string }> = {
  [ResourceType.poolTable]: { label: "8 Ball Pool", icon: "🎱" },
  [ResourceType.ps4Console]: { label: "PS4 Gaming", icon: "🎮" },
  [ResourceType.ps5Console]: { label: "PS5 Zone", icon: "🕹️" },
};

const DURATIONS = [30, 60, 90, 120];

const PAYMENT_OPTIONS = [
  { value: PaymentMethod.upi, label: "UPI Payment", icon: "📲" },
  { value: PaymentMethod.creditCard, label: "Credit / Debit Card", icon: "💳" },
  { value: PaymentMethod.cash, label: "Pay at Venue", icon: "💵" },
];

function isPeakHour(date: Date): boolean {
  const h = date.getHours();
  return h >= 18 && h < 22;
}

function calcPrice(
  resource: Resource,
  durationMins: number,
  startTime: bigint,
): number {
  const halfHours = durationMins / 30;
  const base = Number(resource.basePricePerHalfHour) * halfHours;
  const slotDate = new Date(Number(startTime / 1_000_000n));
  return isPeakHour(slotDate) ? Math.round(base * 1.5) : base;
}

export default function BookingPage({ selectedGameType, onNavigate }: Props) {
  const { actor } = useActor();
  const { identity, login } = useInternetIdentity();

  const [step, setStep] = useState(1);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<bigint[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<bigint | null>(null);
  const [durationMins, setDurationMins] = useState<number>(60);

  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.upi,
  );
  const [confirming, setConfirming] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
    null,
  );

  useEffect(() => {
    if (!actor) return;
    setLoadingResources(true);
    actor
      .getResourcesByType(selectedGameType)
      .then(setResources)
      .catch(() => toast.error("Failed to load resources"))
      .finally(() => setLoadingResources(false));
  }, [actor, selectedGameType]);

  useEffect(() => {
    if (!actor || !selectedResource || !selectedDate) return;
    const dayStart =
      BigInt(new Date(selectedDate).setHours(0, 0, 0, 0)) * 1_000_000n;
    const dayEnd =
      BigInt(new Date(selectedDate).setHours(23, 59, 59, 999)) * 1_000_000n;
    setLoadingSlots(true);
    setSelectedSlot(null);
    actor
      .getAvailableSlots(selectedResource.id, dayStart, dayEnd)
      .then(setAvailableSlots)
      .catch(() => toast.error("Failed to load slots"))
      .finally(() => setLoadingSlots(false));
  }, [actor, selectedResource, selectedDate]);

  const handleConfirm = async () => {
    if (!actor || !identity || !selectedResource || !selectedSlot) return;
    if (!userName.trim() || !userPhone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setConfirming(true);
    try {
      const booking = await actor.createBooking(
        identity.getPrincipal(),
        userName.trim(),
        userPhone.trim(),
        selectedResource.id,
        BigInt(durationMins),
        selectedSlot,
        paymentMethod,
        couponCode.trim(),
      );
      setConfirmedBooking(booking);
      setStep(4);
      toast.success("Booking confirmed!");
    } catch {
      toast.error("Booking failed. Slot may no longer be available.");
    } finally {
      setConfirming(false);
    }
  };

  const gameInfo = GAME_LABELS[selectedGameType];
  const estimatedPrice =
    selectedResource && selectedSlot
      ? calcPrice(selectedResource, durationMins, selectedSlot)
      : 0;

  const STEPS = ["Select", "Date & Time", "Confirm", "Done"];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            data-ocid="booking.back.link"
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          <div className="font-black text-lg tracking-wider">
            <span className="text-primary">{gameInfo.icon}</span>{" "}
            <span className="text-foreground">{gameInfo.label}</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Step Indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center mb-10 gap-2">
            {STEPS.slice(0, 3).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 ${
                    step === i + 1
                      ? "text-primary"
                      : step > i + 1
                        ? "text-secondary"
                        : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                      step > i + 1
                        ? "border-secondary bg-secondary/20"
                        : step === i + 1
                          ? "border-primary bg-primary/20 shadow-neon-cyan"
                          : "border-border"
                    }`}
                  >
                    {step > i + 1 ? "✓" : i + 1}
                  </div>
                  <span className="hidden sm:block text-xs font-semibold uppercase tracking-wide">
                    {s}
                  </span>
                </div>
                {i < 2 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-6">
                SELECT RESOURCE
              </h2>
              {loadingResources ? (
                <div
                  className="flex justify-center py-16"
                  data-ocid="booking.resources.loading_state"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : resources.length === 0 ? (
                <div
                  className="neon-card p-10 text-center"
                  data-ocid="booking.resources.empty_state"
                >
                  <p className="text-muted-foreground">
                    No resources available for this game type.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {resources
                    .filter((r) => r.isActive)
                    .map((r, i) => (
                      <button
                        type="button"
                        key={String(r.id)}
                        data-ocid={`booking.resource.item.${i + 1}`}
                        onClick={() => setSelectedResource(r)}
                        className={`neon-card p-5 text-left transition-all duration-200 ${
                          selectedResource?.id === r.id
                            ? "border-primary shadow-neon-cyan"
                            : "hover:border-accent/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-foreground mb-1">
                              {r.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {gameInfo.label}
                            </p>
                          </div>
                          {selectedResource?.id === r.id && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="mt-3 flex gap-3">
                          <span className="text-sm font-bold text-primary">
                            ₹{String(r.basePricePerHalfHour)}/30min
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ₹{String(r.basePricePerHour)}/hr
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
              <button
                type="button"
                data-ocid="booking.step1.next.primary_button"
                disabled={!selectedResource}
                onClick={() => setStep(2)}
                className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                NEXT: PICK DATE & TIME
              </button>
            </motion.div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-6">
                DATE & TIME
              </h2>

              <div className="neon-card p-6 mb-6">
                <label
                  htmlFor="booking-date"
                  className="section-title flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  SELECT DATE
                </label>
                <input
                  id="booking-date"
                  data-ocid="booking.date.input"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:shadow-neon-cyan transition-all"
                />
              </div>

              {selectedDate && (
                <div className="neon-card p-6 mb-6">
                  <p className="section-title flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    AVAILABLE SLOTS
                  </p>
                  {loadingSlots ? (
                    <div
                      className="flex justify-center py-8"
                      data-ocid="booking.slots.loading_state"
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p
                      className="text-muted-foreground text-sm py-4"
                      data-ocid="booking.slots.empty_state"
                    >
                      No slots available for this date.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {availableSlots.map((slot, i) => {
                        const slotDate = new Date(Number(slot / 1_000_000n));
                        const label = slotDate.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        });
                        const peak = isPeakHour(slotDate);
                        return (
                          <button
                            type="button"
                            key={String(slot)}
                            data-ocid={`booking.slot.item.${i + 1}`}
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200 ${
                              selectedSlot === slot
                                ? "border-primary bg-primary/20 text-primary shadow-neon-cyan"
                                : peak
                                  ? "border-accent/60 text-accent hover:border-accent hover:bg-accent/10"
                                  : "border-border text-foreground hover:border-primary hover:bg-primary/10"
                            }`}
                          >
                            {label}
                            {peak ? " 🔥" : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="neon-card p-6 mb-6">
                <p className="section-title">DURATION</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  {DURATIONS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      data-ocid={"booking.duration.toggle"}
                      onClick={() => setDurationMins(d)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
                        durationMins === d
                          ? "border-secondary bg-secondary/20 text-secondary shadow-neon-green"
                          : "border-border text-muted-foreground hover:border-secondary/60"
                      }`}
                    >
                      {d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? "s" : ""}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="booking.step2.back.secondary_button"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1 py-3"
                >
                  BACK
                </button>
                <button
                  type="button"
                  data-ocid="booking.step2.next.primary_button"
                  disabled={!selectedSlot || !selectedDate}
                  onClick={() => setStep(3)}
                  className="btn-primary flex-[2] py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  NEXT: CONFIRM
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-6">
                CONFIRM & PAY
              </h2>

              {/* Summary */}
              <div className="neon-card p-6 mb-6">
                <p className="section-title">BOOKING SUMMARY</p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Game</span>
                    <p className="font-semibold text-foreground">
                      {gameInfo.icon} {gameInfo.label}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resource</span>
                    <p className="font-semibold text-foreground">
                      {selectedResource?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date</span>
                    <p className="font-semibold text-foreground">
                      {selectedDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time</span>
                    <p className="font-semibold text-foreground">
                      {selectedSlot
                        ? new Date(
                            Number(selectedSlot / 1_000_000n),
                          ).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration</span>
                    <p className="font-semibold text-foreground">
                      {durationMins} mins
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount</span>
                    <p className="font-bold text-primary text-base">
                      ₹{estimatedPrice}
                    </p>
                  </div>
                </div>
                {selectedSlot &&
                  isPeakHour(new Date(Number(selectedSlot / 1_000_000n))) && (
                    <p className="text-xs text-accent mt-3 font-medium">
                      🔥 Peak hours (6PM–10PM): 1.5× pricing applied
                    </p>
                  )}
              </div>

              {/* Guest prompt */}
              {!identity && (
                <div className="neon-card p-5 mb-6 border-accent/60">
                  <p className="text-sm text-muted-foreground mb-3">
                    Login for faster checkout and booking history tracking.
                  </p>
                  <button
                    type="button"
                    data-ocid="booking.login.primary_button"
                    onClick={login}
                    className="btn-primary text-xs py-2"
                  >
                    LOGIN NOW
                  </button>
                </div>
              )}

              {/* Contact details */}
              <div className="neon-card p-6 mb-6">
                <p className="section-title">YOUR DETAILS</p>
                <div className="space-y-4 mt-3">
                  <div>
                    <label
                      htmlFor="booking-name"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Full Name *
                    </label>
                    <input
                      id="booking-name"
                      data-ocid="booking.name.input"
                      type="text"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="mt-1 w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-neon-cyan transition-all"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="booking-phone"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Phone Number *
                    </label>
                    <input
                      id="booking-phone"
                      data-ocid="booking.phone.input"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="mt-1 w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-neon-cyan transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Coupon */}
              <div className="neon-card p-6 mb-6">
                <p className="section-title">COUPON CODE</p>
                <div className="flex gap-2 mt-3">
                  <input
                    data-ocid="booking.coupon.input"
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:shadow-neon-purple transition-all uppercase"
                  />
                  <button
                    type="button"
                    data-ocid="booking.apply_coupon.secondary_button"
                    className="btn-secondary text-xs px-4 py-2"
                    onClick={() => toast.info("Coupon applied at checkout")}
                  >
                    APPLY
                  </button>
                </div>
              </div>

              {/* Payment */}
              <div className="neon-card p-6 mb-6">
                <p className="section-title">PAYMENT METHOD</p>
                <div className="space-y-2 mt-3">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      data-ocid={"booking.payment.radio"}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        paymentMethod === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{opt.icon}</span>
                      <span className="text-sm font-medium text-foreground">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="booking.step3.back.secondary_button"
                  onClick={() => setStep(2)}
                  className="btn-secondary flex-1 py-3"
                >
                  BACK
                </button>
                <button
                  type="button"
                  data-ocid="booking.confirm.primary_button"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="btn-primary flex-[2] py-3 disabled:opacity-60"
                >
                  {confirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> CONFIRMING…
                    </span>
                  ) : (
                    `CONFIRM BOOKING ₹${estimatedPrice}`
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4 */}
          {step === 4 && confirmedBooking && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6 shadow-neon-green">
                <CheckCircle className="w-12 h-12 text-secondary" />
              </div>
              <h2 className="text-3xl font-black text-foreground mb-2">
                BOOKING CONFIRMED!
              </h2>
              <p className="text-muted-foreground mb-6">
                Your slot is locked in. See you at GameZone!
              </p>

              <div className="neon-card p-6 mb-8 text-left">
                <p className="section-title">BOOKING DETAILS</p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Booking ID</span>
                    <p className="font-mono font-bold text-accent">
                      #{String(confirmedBooking.id)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resource</span>
                    <p className="font-semibold text-foreground">
                      {confirmedBooking.resourceName}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name</span>
                    <p className="font-semibold text-foreground">
                      {confirmedBooking.userName}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount</span>
                    <p className="font-bold text-primary">
                      ₹{String(confirmedBooking.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-semibold text-secondary capitalize">
                      {confirmedBooking.status}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration</span>
                    <p className="font-semibold text-foreground">
                      {String(confirmedBooking.durationMins)} mins
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  data-ocid="booking.view_bookings.primary_button"
                  onClick={() => onNavigate("myBookings")}
                  className="btn-primary flex-1 py-3"
                >
                  VIEW MY BOOKINGS
                </button>
                <button
                  type="button"
                  data-ocid="booking.book_another.secondary_button"
                  onClick={() => {
                    setStep(1);
                    setSelectedResource(null);
                    setSelectedDate("");
                    setSelectedSlot(null);
                    setConfirmedBooking(null);
                    setUserName("");
                    setUserPhone("");
                    setCouponCode("");
                  }}
                  className="btn-secondary flex-1 py-3"
                >
                  BOOK ANOTHER
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
