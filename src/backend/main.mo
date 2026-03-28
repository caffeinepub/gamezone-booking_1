import Map "mo:core/Map";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";


import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  // Types
  type BookingStatus = { #pending; #confirmed; #completed; #cancelled };
  type ResourceType = { #poolTable; #ps4Console; #ps5Console; #snookerTable };
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

  public type UserProfile = {
    name : Text;
    phone : Text;
  };

  // Data Storage
  let resources = Map.empty<Nat, Resource>();
  let bookings = Map.empty<Nat, Booking>();
  let blockedSlots = Map.empty<Nat, BlockedSlot>();
  let coupons = Map.empty<Text, Coupon>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  var resourceIdCounter = 0;
  var bookingIdCounter = 0;
  var blockedSlotIdCounter = 0;

  // Authorization System
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Helper for admin-only functions (removed autoRegisterUser)
  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func updateCallerUserProfile(name : Text, phone : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profiles");
    };
    let profile : UserProfile = {
      name;
      phone;
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(user);
  };

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
    start1 < end2 and start2 < end1;
  };

  func countDigits(s : Text) : Nat {
    var count = 0;
    for (c in s.chars()) {
      if (c >= '0' and c <= '9') { count += 1 };
    };
    count;
  };

  // Initialization - Seed default resources
  public shared ({ caller }) func initializeSystem() : async () {
    requireAdmin(caller);

    if (resources.size() > 0) {
      Runtime.trap("System already initialized");
    };

    let defaultResources = [
      { name = "Pool Table 1"; resourceType = #poolTable; basePricePerHour = 200; basePricePerHalfHour = 120 },
      { name = "Pool Table 2"; resourceType = #poolTable; basePricePerHour = 200; basePricePerHalfHour = 120 },
      { name = "PS4 Console 1"; resourceType = #ps4Console; basePricePerHour = 120; basePricePerHalfHour = 70 },
      { name = "PS4 Console 2"; resourceType = #ps4Console; basePricePerHour = 120; basePricePerHalfHour = 70 },
      { name = "PS5 Console 1"; resourceType = #ps5Console; basePricePerHour = 200; basePricePerHalfHour = 100 },
      { name = "PS5 Console 2"; resourceType = #ps5Console; basePricePerHour = 200; basePricePerHalfHour = 100 },
    ];

    var localCounter = resourceIdCounter;
    for (resource in defaultResources.values()) {
      resources.add(localCounter, {
        id = localCounter;
        name = resource.name;
        resourceType = resource.resourceType;
        isActive = true;
        basePricePerHour = resource.basePricePerHour;
        basePricePerHalfHour = resource.basePricePerHalfHour;
      });
      localCounter += 1;
    };
    resourceIdCounter := localCounter;
  };

  // Booking Creation
  public shared ({ caller }) func createBooking(userId : Principal, userName : Text, userPhone : Text, resourceId : Nat, durationMins : Nat, startTime : Int, paymentMethod : PaymentMethod, couponCode : Text) : async Booking {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create bookings");
    };

    let resource = getResourceInternal(resourceId);
    if (not resource.isActive) {
      Runtime.trap("Resource is not available");
    };

    if (countDigits(userPhone) < 10) {
      Runtime.trap("Please enter a valid phone number (at least 10 digits)");
    };

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

    for (slot in blockedSlots.values()) {
      if (slot.resourceId == resourceId) {
        let bookingEndTime = startTime + (durationMins * 60 * 1_000_000_000);
        if (hasOverlap(startTime, bookingEndTime, slot.startTime, slot.endTime)) {
          Runtime.trap("This slot is blocked. Please choose a different time");
        };
      };
    };

    var dailyBookingCount = 0;
    let currentTime = Time.now();
    for (booking in bookings.values()) {
      if (booking.userId == userId and (booking.startTime > currentTime - 86_400_000_000_000) and (booking.startTime < currentTime + 86_400_000_000_000)) {
        dailyBookingCount += 1;
      };
    };

    if (dailyBookingCount >= 4) {
      Runtime.trap("You have reached the daily booking limit");
    };

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

  // Get Available Slots
  public query ({ caller }) func getAvailableSlots(resourceId : Nat, dateStartNanos : Int, dateEndNanos : Int) : async [Int] {
    let resource = getResourceInternal(resourceId);
    if (not resource.isActive) {
      Runtime.trap("Resource is not available");
    };

    let intervalNanos : Int = 1_800_000_000_000;
    let currentTime = Time.now();
    var slots : [Int] = [];
    var nextSlot = dateStartNanos;

    while (nextSlot <= dateEndNanos) {
      if (nextSlot >= currentTime and IntervalIsAvailable(resourceId, nextSlot, nextSlot + intervalNanos)) {
        slots := slots.concat([nextSlot]);
      };
      nextSlot += intervalNanos;
    };
    slots;
  };

  func IntervalIsAvailable(resourceId : Nat, slotStart : Int, slotEnd : Int) : Bool {
    let blocked = bookings.values().any(
      func(booking) {
        (booking.resourceId == resourceId) and
        (booking.status == #pending or booking.status == #confirmed) and
        hasOverlap(slotStart, slotEnd, booking.startTime, booking.startTime + (booking.durationMins * 60 * 1_000_000_000) + (10 * 60 * 1_000_000_000));
      }
    );
    if (blocked) { return false };
    not blockedSlots.values().any(
      func(slot) {
        (slot.resourceId == resourceId) and hasOverlap(slotStart, slotEnd, slot.startTime, slot.endTime)
      }
    );
  };

  // Cancel Booking
  public shared ({ caller }) func cancelBooking(bookingId : Nat) : async Booking {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can cancel bookings");
    };

    let booking = getBookingInternal(bookingId);

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

  // Add Resource - requires user authentication
  public shared ({ caller }) func addResource(name : Text, resourceType : ResourceType, basePricePerHour : Nat, basePricePerHalfHour : Nat) : async Resource {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add resources");
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

  // Block Slot - requires user authentication
  public shared ({ caller }) func blockSlot(resourceId : Nat, startTime : Int, endTime : Int, reason : Text) : async BlockedSlot {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can block slots");
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

  // Add Coupon - requires user authentication
  public shared ({ caller }) func addCoupon(code : Text, discountPercent : Nat) : async Coupon {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add coupons");
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

  // Get All Bookings - requires user authentication
  public query ({ caller }) func getAllBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view all bookings");
    };
    bookings.values().toArray().sort(Booking.compareByStartTime);
  };

  // Get User Bookings - public query
  public query ({ caller }) func getUserBookings(userId : Principal) : async [Booking] {
    bookings.values().toArray().filter(func(b) { b.userId == userId }).sort(Booking.compareByStartTime);
  };

  // Get Active Coupons - public query
  public query ({ caller }) func getActiveCoupons() : async [Coupon] {
    coupons.values().toArray().sort().filter(func(c) { c.isActive });
  };

  // Get Resources By Type - public query
  public query ({ caller }) func getResourcesByType(resourceType : ResourceType) : async [Resource] {
    resources.values().toArray().sort().filter(func(r) { r.resourceType == resourceType and r.isActive });
  };

  // Get Blocked Slots for Resource - public query
  public query ({ caller }) func getBlockedSlotsForResource(resourceId : Nat) : async [BlockedSlot] {
    blockedSlots.values().toArray().filter(func(s) { s.resourceId == resourceId }).sort();
  };

  // Update Booking Status - requires user authentication
  public shared ({ caller }) func updateBookingStatus(bookingId : Nat, status : BookingStatus) : async Booking {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update booking status");
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

  // Get Admin Stats - requires user authentication
  public query ({ caller }) func getAdminStats() : async AdminStats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view admin stats");
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

  // Get Booking Details - public query
  public query ({ caller }) func getBooking(bookingId : Nat) : async Booking {
    getBookingInternal(bookingId);
  };

  // Get Resource Details - public query
  public query ({ caller }) func getResource(resourceId : Nat) : async Resource {
    getResourceInternal(resourceId);
  };

  // Get Coupon Details - public query
  public query ({ caller }) func getCoupon(code : Text) : async Coupon {
    getCouponInternal(code);
  };

  // Get All Resources - public query
  public query ({ caller }) func getAllResources() : async [Resource] {
    resources.values().toArray().sort();
  };

  // Get All Blocked Slots - requires user authentication
  public query ({ caller }) func getAllBlockedSlots() : async [BlockedSlot] {
    blockedSlots.values().toArray().sort();
  };
};
