import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Types
  type BookingStatus = { #pending; #confirmed; #completed; #cancelled };
  type ResourceType = { #poolTable; #ps4Console; #ps5Console };
  type PaymentMethod = { #cash; #upi; #creditCard };

  type Resource = {
    id : Nat;
    name : Text;
    resourceType : ResourceType;
    isActive : Bool;
    basePricePerHour : Nat;
    basePricePerHalfHour : Nat;
  };

  type Booking = {
    id : Nat;
    userId : Principal;
    userName : Text;
    userPhone : Text;
    resourceId : Nat;
    resourceType : ResourceType;
    resourceName : Text;
    startTime : Int;
    durationMins : Nat;
    status : BookingStatus;
    paymentMethod : PaymentMethod;
    totalAmount : Nat;
    couponCode : Text;
    createdAt : Int;
  };

  type BlockedSlot = {
    id : Nat;
    resourceId : Nat;
    startTime : Int;
    endTime : Int;
    reason : Text;
  };

  type Coupon = {
    code : Text;
    discountPercent : Nat;
    isActive : Bool;
  };

  type AdminStats = {
    todayBookingCount : Nat;
    todayRevenue : Nat;
    weekRevenue : Nat;
  };

  // Data Storage
  let resources = Map.empty<Nat, Resource>();
  let bookings = Map.empty<Nat, Booking>();
  let blockedSlots = Map.empty<Nat, BlockedSlot>();
  let coupons = Map.empty<Text, Coupon>();

  var resourceIdCounter = 0;
  var bookingIdCounter = 0;
  var blockedSlotIdCounter = 0;

  // Authorization System
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Comparison Functions
  module Resource {
    public func compare(a : Resource, b : Resource) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module Booking {
    public func compare(a : Booking, b : Booking) : Order.Order {
      Nat.compare(a.id, b.id);
    };

    public func compareByStartTime(a : Booking, b : Booking) : Order.Order {
      Int.compare(a.startTime, b.startTime);
    };
  };

  module BlockedSlot {
    public func compare(a : BlockedSlot, b : BlockedSlot) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module Coupon {
    public func compare(a : Coupon, b : Coupon) : Order.Order {
      Text.compare(a.code, b.code);
    };
  };

  // Utility Functions
  func getResourceInternal(resourceId : Nat) : Resource {
    switch (resources.get(resourceId)) {
      case (?resource) { resource };
      case (null) { Runtime.trap("Resource not found") };
    };
  };

  func getBookingInternal(bookingId : Nat) : Booking {
    switch (bookings.get(bookingId)) {
      case (?booking) { booking };
      case (null) { Runtime.trap("Booking not found") };
    };
  };

  func getCouponInternal(code : Text) : Coupon {
    switch (coupons.get(code)) {
      case (?coupon) { coupon };
      case (null) { Runtime.trap("Coupon not found") };
    };
  };

  func calculateAmount(resource : Resource, durationMins : Nat, couponCode : Text) : Nat {
    var amount = 0;
    if (durationMins >= 60) {
      amount += (durationMins / 60) * resource.basePricePerHour;
      if (durationMins % 60 > 0) {
        amount += resource.basePricePerHalfHour;
      };
    } else if (durationMins >= 30) {
      amount += resource.basePricePerHalfHour;
    };

    // Apply coupon discount
    if (couponCode != "") {
      switch (coupons.get(couponCode)) {
        case (?coupon) {
          if (coupon.isActive) {
            amount := amount - (amount * coupon.discountPercent) / 100;
          };
        };
        case (null) {};
      };
    };
    amount;
  };

  func hasOverlap(start1 : Int, end1 : Int, start2 : Int, end2 : Int) : Bool {
    start1 < end2 and start2 < end1  // If start1 is before end2 and start2 is before end1, there is an overlap
  };

  func nanosToMinutes(nanos : Int) : Int {
    nanos / (1_000_000_000 * 60);
  };

  // Initialization - Seed default resources
  public shared ({ caller }) func initializeSystem() : async () {
    if (resources.size() > 0) {
      Runtime.trap("System already initialized");
    };

    let defaultResources = [
      {
        name = "Pool Table 1";
        resourceType = #poolTable;
        basePricePerHour = 200;
        basePricePerHalfHour = 120;
      },
      {
        name = "Pool Table 2";
        resourceType = #poolTable;
        basePricePerHour = 200;
        basePricePerHalfHour = 120;
      },
      {
        name = "PS4 Console 1";
        resourceType = #ps4Console;
        basePricePerHour = 120;
        basePricePerHalfHour = 70;
      },
      {
        name = "PS4 Console 2";
        resourceType = #ps4Console;
        basePricePerHour = 120;
        basePricePerHalfHour = 70;
      },
      {
        name = "PS5 Console 1";
        resourceType = #ps5Console;
        basePricePerHour = 200;
        basePricePerHalfHour = 100;
      },
    ];

    var localResourceIdCounter = resourceIdCounter;
    for (resource in defaultResources.values()) {
      resources.add(
        resourceIdCounter,
        {
          id = resourceIdCounter;
          name = resource.name;
          resourceType = resource.resourceType;
          isActive = true;
          basePricePerHour = resource.basePricePerHour;
          basePricePerHalfHour = resource.basePricePerHalfHour;
        },
      );
      localResourceIdCounter += 1;
    };
    resourceIdCounter := localResourceIdCounter;
  };

  // Booking Creation
  public shared ({ caller }) func createBooking(userId : Principal, userName : Text, userPhone : Text, resourceId : Nat, durationMins : Nat, startTime : Int, paymentMethod : PaymentMethod, couponCode : Text) : async Booking {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create bookings");
    };

    // Check booking do not exceed 6 hours in future for fairness
    let currentTime = Time.now();
    if (startTime > currentTime + 21_600_000_000_000) {
      Runtime.trap("Cannot book slots more than 6 hours in advance");
    };

    let resource = getResourceInternal(resourceId);
    if (not resource.isActive) {
      Runtime.trap("Resource is not available");
    };

    // Validate phone number (10 digits)
    if (userPhone.size() != 10) {
      Runtime.trap("Phone number must be exactly 10 digits");
    };

    // Check conflicting bookings for the same resource
    let endTime = startTime + (durationMins * 60 * 1_000_000_000);
    for (booking in bookings.values()) {
      if (booking.resourceId == resourceId) {
        switch (booking.status) {
          case (#pending) {
            if (hasOverlap(startTime, endTime, booking.startTime, booking.startTime + (booking.durationMins * 60 * 1_000_000_000))) {
              Runtime.trap("Conflicting booking exists within selected duration");
            };
          };
          case (#cancelled) {};
          case (_) {
            if (hasOverlap(startTime, endTime, booking.startTime, booking.startTime + (booking.durationMins * 60 * 1_000_000_000) + (10 * 60 * 1_000_000_000))) {
              Runtime.trap("Conflicting booking exists within selected duration");
            };
          };
        };
      };
    };

    // Check blocked slots
    for (slot in blockedSlots.values()) {
      if (slot.resourceId == resourceId) {
        let bookingEndTime = startTime + (durationMins * 60 * 1_000_000_000);
        if (hasOverlap(startTime, bookingEndTime, slot.startTime, slot.endTime)) {
          Runtime.trap("This slot is blocked. Please choose a different time");
        };
      };
    };

    // Limit to 4 bookings per user per day in backend
    var dailyBookingCount = 0;
    for (booking in bookings.values()) {
      if (booking.userId == userId and (booking.startTime > currentTime - 86_400_000_000_000) and (booking.startTime < currentTime + 86_400_000_000_000)) {
        dailyBookingCount += 1;
      };
    };
    if (dailyBookingCount >= 4) {
      Runtime.trap("You have reached the daily booking limit");
    };

    // Calculate amount and discount
    let amount = calculateAmount(resource, durationMins, couponCode);

    let booking = {
      id = bookingIdCounter;
      userId = userId;
      userName;
      userPhone;
      resourceId;
      resourceType = resource.resourceType;
      resourceName = resource.name;
      startTime;
      durationMins;
      status = #pending;
      paymentMethod;
      totalAmount = amount;
      couponCode;
      createdAt = currentTime;
    };
    bookings.add(bookingIdCounter, booking);
    bookingIdCounter += 1;
    booking;
  };

  // Get Available Slots (for 30-minute intervals)
  public shared ({ caller }) func getAvailableSlots(resourceId : Nat, dateStartNanos : Int, dateEndNanos : Int) : async [Int] {
    let resource = getResourceInternal(resourceId);
    if (not resource.isActive) {
      Runtime.trap("Resource is not available");
    };

    let intervalNanos : Int = 1_800_000_000_000; // 30 minutes in nanoseconds
    let currentTime = Time.now();
    var slots = [dateStartNanos];
    var nextSlot = dateStartNanos + intervalNanos;

    while (nextSlot <= dateEndNanos) {
      if (nextSlot >= currentTime and IntervalIsAvailable(resourceId, nextSlot, nextSlot + intervalNanos)) {
        slots := slots.concat([nextSlot]);
        nextSlot += intervalNanos;
      };
    };
    slots;
  };

  func IntervalIsAvailable(resourceId : Nat, slotStart : Int, slotEnd : Int) : Bool {
    let blocked = bookings.values().any(
      func(booking) {
        (booking.resourceId == resourceId) and (booking.startTime <= slotEnd) and (booking.status == #pending or booking.status == #confirmed);
      }
    );
    if (blocked) { return false };
    blockedSlots.values().all(
      func(slot) {
        (slot.resourceId != resourceId) or (slot.startTime > slotEnd)
      }
    );
  };

  // Cancel Booking
  public shared ({ caller }) func cancelBooking(bookingId : Nat) : async Booking {
    let booking = getBookingInternal(bookingId);
    let currentTime = Time.now();

    if (booking.userId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the booking owner or admin can cancel this booking");
    };

    if (booking.startTime <= currentTime + 7_200_000_000_000) {
      Runtime.trap("Cannot cancel booking within 2 hours of start time");
    };

    if (booking.status == #cancelled) {
      Runtime.trap("Booking is already cancelled");
    };

    let updatedBooking = {
      id = booking.id;
      userId = booking.userId;
      userName = booking.userName;
      userPhone = booking.userPhone;
      resourceId = booking.resourceId;
      resourceType = booking.resourceType;
      resourceName = booking.resourceName;
      startTime = booking.startTime;
      durationMins = booking.durationMins;
      status = #cancelled;
      paymentMethod = booking.paymentMethod;
      totalAmount = booking.totalAmount;
      couponCode = booking.couponCode;
      createdAt = booking.createdAt;
    };
    bookings.add(bookingId, updatedBooking);
    updatedBooking;
  };

  // Admin-Only: Add Resource
  public shared ({ caller }) func addResource(name : Text, resourceType : ResourceType, basePricePerHour : Nat, basePricePerHalfHour : Nat) : async Resource {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add resources");
    };

    if (name.size() < 5) {
      Runtime.trap("Name must be at least 5 characters long");
    };

    if (basePricePerHour < 50 or basePricePerHour > 500) {
      Runtime.trap("Price must be between 50 and 500 INR");
    };

    if (basePricePerHalfHour < 25 or basePricePerHalfHour > 300) {
      Runtime.trap("Half hour price must be between 25 and 300 INR");
    };

    let resource = {
      id = resourceIdCounter;
      name;
      resourceType;
      isActive = true;
      basePricePerHour;
      basePricePerHalfHour;
    };
    resources.add(resourceIdCounter, resource);
    resourceIdCounter += 1;
    resource;
  };

  // Admin-Only: Block Slot
  public shared ({ caller }) func blockSlot(resourceId : Nat, startTime : Int, endTime : Int, reason : Text) : async BlockedSlot {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can block slots");
    };

    let resource = getResourceInternal(resourceId);
    if (not resource.isActive) {
      Runtime.trap("Resource is not available");
    };

    if (startTime >= endTime) {
      Runtime.trap("Invalid time range");
    };

    let slot = {
      id = blockedSlotIdCounter;
      resourceId;
      startTime;
      endTime;
      reason;
    };
    blockedSlots.add(blockedSlotIdCounter, slot);
    blockedSlotIdCounter += 1;
    slot;
  };

  // Admin-Only: Add Coupon
  public shared ({ caller }) func addCoupon(code : Text, discountPercent : Nat) : async Coupon {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can add coupons");
    };

    if (code.size() < 5) {
      Runtime.trap("Coupon code must be at least 5 characters");
    };

    if (discountPercent < 5 or discountPercent > 50) {
      Runtime.trap("Discount must be between 5% and 50%");
    };

    let coupon : Coupon = {
      code;
      discountPercent;
      isActive = true;
    };
    coupons.add(code, coupon);
    coupon;
  };

  // Admin-Only: Get All Bookings
  public query ({ caller }) func getAllBookings() : async [Booking] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can fetch all bookings");
    };
    bookings.values().toArray().sort(Booking.compareByStartTime);
  };

  // Get User Bookings
  public query ({ caller }) func getUserBookings(userId : Principal) : async [Booking] {
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own bookings");
    };
    bookings.values().toArray().filter(func(b) { b.userId == userId }).sort(Booking.compareByStartTime);
  };

  // Get Active Coupons
  public query ({ caller }) func getActiveCoupons() : async [Coupon] {
    coupons.values().toArray().sort().filter(func(c) { c.isActive });
  };

  // Get Resources By Type
  public query ({ caller }) func getResourcesByType(resourceType : ResourceType) : async [Resource] {
    resources.values().toArray().sort().filter(func(r) { r.resourceType == resourceType and r.isActive });
  };

  // Get Blocked Slots for Resource
  public query ({ caller }) func getBlockedSlotsForResource(resourceId : Nat) : async [BlockedSlot] {
    blockedSlots.values().toArray().filter(func(s) { s.resourceId == resourceId }).sort();
  };

  // Admin-Only: Update Booking Status
  public shared ({ caller }) func updateBookingStatus(bookingId : Nat, status : BookingStatus) : async Booking {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update booking status");
    };
    let booking = getBookingInternal(bookingId);
    let updatedBooking = {
      id = booking.id;
      userId = booking.userId;
      userName = booking.userName;
      userPhone = booking.userPhone;
      resourceId = booking.resourceId;
      resourceType = booking.resourceType;
      resourceName = booking.resourceName;
      startTime = booking.startTime;
      durationMins = booking.durationMins;
      status;
      paymentMethod = booking.paymentMethod;
      totalAmount = booking.totalAmount;
      couponCode = booking.couponCode;
      createdAt = booking.createdAt;
    };
    bookings.add(bookingId, updatedBooking);
    updatedBooking;
  };

  // Admin-Only: Get Admin Stats (today's and week's stats)
  public query ({ caller }) func getAdminStats() : async AdminStats {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can get stats");
    };

    let currentTime = Time.now();
    let todayBookings = bookings.values().toArray().filter(
      func(b) { b.startTime > currentTime - 86_400_000_000_000 }
    );
    let weekBookings = bookings.values().toArray().filter(
      func(b) { b.startTime > currentTime - 604_800_000_000_000 }
    );
    let todayBookingCount = todayBookings.size();
    let todayRevenue = todayBookings.foldLeft(0, func(acc, b) { acc + b.totalAmount });
    let weekRevenue = weekBookings.foldLeft(0, func(acc, b) { acc + b.totalAmount });

    {
      todayBookingCount;
      todayRevenue;
      weekRevenue;
    };
  };

  // Get Booking Details
  public query ({ caller }) func getBooking(bookingId : Nat) : async Booking {
    getBookingInternal(bookingId);
  };

  // Get Resource Details
  public query ({ caller }) func getResource(resourceId : Nat) : async Resource {
    getResourceInternal(resourceId);
  };

  // Get Coupon Details
  public query ({ caller }) func getCoupon(code : Text) : async Coupon {
    getCouponInternal(code);
  };

  // Get All Resources (Active or Inactive)
  public query ({ caller }) func getAllResources() : async [Resource] {
    resources.values().toArray().sort();
  };

  // Get All Blocked Slots (Admin Only)
  public query ({ caller }) func getAllBlockedSlots() : async [BlockedSlot] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can fetch blocked slots");
    };
    blockedSlots.values().toArray().sort();
  };
};
