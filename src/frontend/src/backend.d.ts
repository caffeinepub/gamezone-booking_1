import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AdminStats {
    todayBookingCount: bigint;
    todayRevenue: bigint;
    weekRevenue: bigint;
}
export interface Resource {
    id: bigint;
    name: string;
    basePricePerHalfHour: bigint;
    isActive: boolean;
    resourceType: ResourceType;
    basePricePerHour: bigint;
}
export interface Booking {
    id: bigint;
    startTime: bigint;
    status: BookingStatus;
    durationMins: bigint;
    userName: string;
    couponCode: string;
    paymentMethod: PaymentMethod;
    resourceId: bigint;
    userId: Principal;
    createdAt: bigint;
    userPhone: string;
    resourceName: string;
    resourceType: ResourceType;
    totalAmount: bigint;
}
export interface Coupon {
    code: string;
    discountPercent: bigint;
    isActive: boolean;
}
export interface BlockedSlot {
    id: bigint;
    startTime: bigint;
    endTime: bigint;
    resourceId: bigint;
    reason: string;
}
export enum BookingStatus {
    cancelled = "cancelled",
    pending = "pending",
    completed = "completed",
    confirmed = "confirmed"
}
export enum PaymentMethod {
    upi = "upi",
    creditCard = "creditCard",
    cash = "cash"
}
export enum ResourceType {
    ps4Console = "ps4Console",
    ps5Console = "ps5Console",
    poolTable = "poolTable"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCoupon(code: string, discountPercent: bigint): Promise<Coupon>;
    addResource(name: string, resourceType: ResourceType, basePricePerHour: bigint, basePricePerHalfHour: bigint): Promise<Resource>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockSlot(resourceId: bigint, startTime: bigint, endTime: bigint, reason: string): Promise<BlockedSlot>;
    cancelBooking(bookingId: bigint): Promise<Booking>;
    createBooking(userId: Principal, userName: string, userPhone: string, resourceId: bigint, durationMins: bigint, startTime: bigint, paymentMethod: PaymentMethod, couponCode: string): Promise<Booking>;
    getActiveCoupons(): Promise<Array<Coupon>>;
    getAdminStats(): Promise<AdminStats>;
    getAllBlockedSlots(): Promise<Array<BlockedSlot>>;
    getAllBookings(): Promise<Array<Booking>>;
    getAllResources(): Promise<Array<Resource>>;
    getAvailableSlots(resourceId: bigint, dateStartNanos: bigint, dateEndNanos: bigint): Promise<Array<bigint>>;
    getBlockedSlotsForResource(resourceId: bigint): Promise<Array<BlockedSlot>>;
    getBooking(bookingId: bigint): Promise<Booking>;
    getCallerUserRole(): Promise<UserRole>;
    getCoupon(code: string): Promise<Coupon>;
    getResource(resourceId: bigint): Promise<Resource>;
    getResourcesByType(resourceType: ResourceType): Promise<Array<Resource>>;
    getUserBookings(userId: Principal): Promise<Array<Booking>>;
    initializeSystem(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    updateBookingStatus(bookingId: bigint, status: BookingStatus): Promise<Booking>;
}
