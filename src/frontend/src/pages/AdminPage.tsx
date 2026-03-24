import {
  ChevronLeft,
  DollarSign,
  Loader2,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import {
  type AdminStats,
  type Booking,
  BookingStatus,
  type Coupon,
  type Resource,
  ResourceType,
} from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onNavigate: (page: Page) => void;
}

type AdminTab = "dashboard" | "resources" | "bookings" | "coupons";

const STATUS_OPTIONS = [
  { value: BookingStatus.pending, label: "Pending" },
  { value: BookingStatus.confirmed, label: "Confirmed" },
  { value: BookingStatus.completed, label: "Completed" },
  { value: BookingStatus.cancelled, label: "Cancelled" },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: ResourceType.poolTable, label: "Pool Table" },
  { value: ResourceType.ps4Console, label: "PS4 Console" },
  { value: ResourceType.ps5Console, label: "PS5 Console" },
  { value: ResourceType.snookerTable, label: "Snooker Table" },
];

export default function AdminPage({ onNavigate }: Props) {
  const { actor, isFetching: actorLoading, refetch: retryActor } = useActor();
  const { identity, login, isLoggingIn } = useInternetIdentity();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  // Dashboard
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [newResName, setNewResName] = useState("");
  const [newResType, setNewResType] = useState<ResourceType>(
    ResourceType.ps5Console,
  );
  const [newResPriceHr, setNewResPriceHr] = useState("");
  const [newResPriceHalf, setNewResPriceHalf] = useState("");
  const [addingRes, setAddingRes] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [addingCoupon, setAddingCoupon] = useState(false);

  useEffect(() => {
    if (identity) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    setChecking(false);
  }, [identity]);

  useEffect(() => {
    if (!actor || !isAdmin) return;
    Promise.all([
      actor.getAdminStats(),
      actor.getAllResources(),
      actor.getActiveCoupons(),
    ])
      .then(([s, r, c]) => {
        setStats(s);
        setResources(r);
        setCoupons(c);
      })
      .catch(() => toast.error("Failed to load admin data"));
  }, [actor, isAdmin]);

  useEffect(() => {
    if (!actor || !isAdmin || activeTab !== "bookings") return;
    setLoadingBookings(true);
    actor
      .getAllBookings()
      .then(setBookings)
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoadingBookings(false));
  }, [actor, isAdmin, activeTab]);

  const handleAddResource = async () => {
    // Validate fields first
    if (!newResName.trim() || !newResPriceHr || !newResPriceHalf) {
      toast.error("Please fill all resource fields");
      return;
    }
    // Then check actor connection
    if (!actor) {
      retryActor();
      toast.error("Connecting to backend, please try again in a moment.");
      return;
    }
    setAddingRes(true);
    try {
      const r = await actor.addResource(
        newResName.trim(),
        newResType,
        BigInt(Math.round(Number(newResPriceHr))),
        BigInt(Math.round(Number(newResPriceHalf))),
      );
      setResources((prev) => [...prev, r]);
      setNewResName("");
      setNewResPriceHr("");
      setNewResPriceHalf("");
      toast.success("Resource added!");
    } catch {
      toast.error("Failed to add resource");
    } finally {
      setAddingRes(false);
    }
  };

  const handleStatusUpdate = async (
    bookingId: bigint,
    status: BookingStatus,
  ) => {
    if (!actor) return;
    try {
      const updated = await actor.updateBookingStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b)),
      );
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAddCoupon = async () => {
    if (!actor || !newCouponCode.trim() || !newCouponDiscount) {
      toast.error("Fill coupon fields");
      return;
    }
    setAddingCoupon(true);
    try {
      const c = await actor.addCoupon(
        newCouponCode.trim().toUpperCase(),
        BigInt(Math.round(Number(newCouponDiscount))),
      );
      setCoupons((prev) => [...prev, c]);
      setNewCouponCode("");
      setNewCouponDiscount("");
      toast.success("Coupon added!");
    } catch {
      toast.error("Failed to add coupon");
    } finally {
      setAddingCoupon(false);
    }
  };

  const TABS: { id: AdminTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "resources", label: "Resources" },
    { id: "bookings", label: "Bookings" },
    { id: "coupons", label: "Coupons" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            data-ocid="admin.back.link"
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          <div className="font-black text-lg tracking-wider text-foreground">
            ⚙️ ADMIN PANEL
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {checking ? (
          <div
            className="flex justify-center py-24"
            data-ocid="admin.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !identity ? (
          <div className="neon-card p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Login to access the admin panel.
            </p>
            <button
              type="button"
              data-ocid="admin.login.primary_button"
              onClick={login}
              disabled={isLoggingIn}
              className="btn-primary px-10 py-3"
            >
              {isLoggingIn ? "Connecting…" : "LOGIN"}
            </button>
          </div>
        ) : !isAdmin ? (
          <div
            className="neon-card p-12 text-center"
            data-ocid="admin.denied.card"
          >
            <p className="text-2xl mb-2">🚫</p>
            <h2 className="text-xl font-black text-foreground mb-2">
              ACCESS DENIED
            </h2>
            <p className="text-muted-foreground">
              You do not have admin privileges.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-muted/30 p-1 rounded-xl mb-8 w-fit">
              {TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  data-ocid={`admin.${tab.id}.tab`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all ${
                    activeTab === tab.id
                      ? "bg-card text-primary shadow-neon-cyan"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-2xl font-black text-foreground uppercase mb-6">
                  DASHBOARD
                </h2>
                {stats ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    <StatCard
                      icon={<Users className="w-6 h-6" />}
                      label="Today's Bookings"
                      value={String(stats.todayBookingCount)}
                      color="primary"
                    />
                    <StatCard
                      icon={<DollarSign className="w-6 h-6" />}
                      label="Today's Revenue"
                      value={`₹${String(stats.todayRevenue)}`}
                      color="secondary"
                    />
                    <StatCard
                      icon={<TrendingUp className="w-6 h-6" />}
                      label="Week Revenue"
                      value={`₹${String(stats.weekRevenue)}`}
                      color="accent"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </motion.div>
            )}

            {/* Resources */}
            {activeTab === "resources" && (
              <motion.div
                key="resources"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-2xl font-black text-foreground uppercase mb-6">
                  RESOURCES
                </h2>

                {/* Add form */}
                <div className="neon-card p-6 mb-6">
                  <p className="section-title mb-4">ADD NEW RESOURCE</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Name
                      </p>
                      <input
                        id="admin-res-name"
                        data-ocid="admin.resource.name.input"
                        type="text"
                        placeholder="e.g. Table 1"
                        value={newResName}
                        onChange={(e) => setNewResName(e.target.value)}
                        className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Type
                      </p>
                      <select
                        id="admin-res-type"
                        data-ocid="admin.resource.type.select"
                        value={newResType}
                        onChange={(e) =>
                          setNewResType(e.target.value as ResourceType)
                        }
                        className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-all"
                      >
                        {RESOURCE_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Price/hr (₹)
                      </p>
                      <input
                        id="admin-res-hr"
                        data-ocid="admin.resource.price_hr.input"
                        type="number"
                        placeholder="100"
                        value={newResPriceHr}
                        onChange={(e) => setNewResPriceHr(e.target.value)}
                        className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Price/30min (₹)
                      </p>
                      <input
                        id="admin-res-half"
                        data-ocid="admin.resource.price_half.input"
                        type="number"
                        placeholder="60"
                        value={newResPriceHalf}
                        onChange={(e) => setNewResPriceHalf(e.target.value)}
                        className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {actorLoading && (
                    <p
                      className="flex items-center gap-2 text-xs text-muted-foreground mt-3"
                      data-ocid="admin.resource.loading_state"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Connecting to backend…
                    </p>
                  )}

                  <button
                    type="button"
                    data-ocid="admin.resource.add.primary_button"
                    onClick={handleAddResource}
                    disabled={addingRes || actorLoading}
                    className="btn-primary mt-4 px-6 py-2.5 text-sm disabled:opacity-60"
                  >
                    {addingRes ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Adding…
                      </span>
                    ) : actorLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> ADD RESOURCE
                      </span>
                    )}
                  </button>
                </div>

                {/* Table */}
                <div className="neon-card overflow-hidden">
                  <table
                    className="w-full text-sm"
                    data-ocid="admin.resources.table"
                  >
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Price/hr
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Price/30m
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((r, i) => (
                        <tr
                          key={String(r.id)}
                          data-ocid={`admin.resources.row.${i + 1}`}
                          className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {r.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">
                            {r.resourceType}
                          </td>
                          <td className="px-4 py-3 text-primary">
                            ₹{String(r.basePricePerHour)}
                          </td>
                          <td className="px-4 py-3 text-primary">
                            ₹{String(r.basePricePerHalfHour)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-full border ${
                                r.isActive
                                  ? "text-secondary border-secondary/60 bg-secondary/10"
                                  : "text-muted-foreground border-border"
                              }`}
                            >
                              {r.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resources.length === 0 && (
                    <p
                      className="text-center text-muted-foreground py-8"
                      data-ocid="admin.resources.empty_state"
                    >
                      No resources added yet.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Bookings */}
            {activeTab === "bookings" && (
              <motion.div
                key="bookings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-2xl font-black text-foreground uppercase mb-6">
                  ALL BOOKINGS
                </h2>
                {loadingBookings ? (
                  <div
                    className="flex justify-center py-16"
                    data-ocid="admin.bookings.loading_state"
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="neon-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table
                        className="w-full text-sm"
                        data-ocid="admin.bookings.table"
                      >
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Resource
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((b, i) => (
                            <tr
                              key={String(b.id)}
                              data-ocid={`admin.bookings.row.${i + 1}`}
                              className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono text-accent text-xs">
                                #{String(b.id)}
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {b.userName}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {b.resourceName}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {new Date(
                                  Number(b.startTime / 1_000_000n),
                                ).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="px-4 py-3 text-primary font-semibold">
                                ₹{String(b.totalAmount)}
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  data-ocid={"admin.booking.status.select"}
                                  value={b.status}
                                  onChange={(e) =>
                                    handleStatusUpdate(
                                      b.id,
                                      e.target.value as BookingStatus,
                                    )
                                  }
                                  className="bg-muted border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                                >
                                  {STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {bookings.length === 0 && (
                      <p
                        className="text-center text-muted-foreground py-8"
                        data-ocid="admin.bookings.empty_state"
                      >
                        No bookings yet.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Coupons */}
            {activeTab === "coupons" && (
              <motion.div
                key="coupons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-2xl font-black text-foreground uppercase mb-6">
                  COUPONS
                </h2>

                <div className="neon-card p-6 mb-6">
                  <p className="section-title mb-4">ADD COUPON</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Code
                      </p>
                      <input
                        id="admin-coupon-code"
                        data-ocid="admin.coupon.code.input"
                        type="text"
                        placeholder="HAPPYHOUR"
                        value={newCouponCode}
                        onChange={(e) =>
                          setNewCouponCode(e.target.value.toUpperCase())
                        }
                        className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all uppercase"
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Discount %
                      </p>
                      <input
                        id="admin-coupon-disc"
                        data-ocid="admin.coupon.discount.input"
                        type="number"
                        placeholder="20"
                        min="1"
                        max="100"
                        value={newCouponDiscount}
                        onChange={(e) => setNewCouponDiscount(e.target.value)}
                        className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        data-ocid="admin.coupon.add.primary_button"
                        onClick={handleAddCoupon}
                        disabled={addingCoupon}
                        className="btn-primary px-6 py-2.5 text-sm disabled:opacity-60"
                      >
                        {addingCoupon ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> ADD
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {coupons.length === 0 ? (
                    <p
                      className="text-muted-foreground col-span-3 py-4"
                      data-ocid="admin.coupons.empty_state"
                    >
                      No active coupons.
                    </p>
                  ) : (
                    coupons.map((c, i) => (
                      <div
                        key={c.code}
                        data-ocid={`admin.coupons.item.${i + 1}`}
                        className="neon-card p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-mono font-black text-accent text-lg">
                            {c.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {String(c.discountPercent)}% discount
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full border ${
                            c.isActive
                              ? "text-secondary border-secondary/60 bg-secondary/10"
                              : "text-muted-foreground border-border"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "primary" | "secondary" | "accent";
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/40 shadow-neon-cyan",
    secondary:
      "text-secondary bg-secondary/10 border-secondary/40 shadow-neon-green",
    accent: "text-accent bg-accent/10 border-accent/40 shadow-neon-purple",
  };
  return (
    <div
      className={`neon-card p-6 border ${colorMap[color]}`}
      data-ocid="admin.stat.card"
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
          color === "primary"
            ? "bg-primary/20 text-primary"
            : color === "secondary"
              ? "bg-secondary/20 text-secondary"
              : "bg-accent/20 text-accent"
        }`}
      >
        {icon}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-3xl font-black ${
          color === "primary"
            ? "text-primary"
            : color === "secondary"
              ? "text-secondary"
              : "text-accent"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
