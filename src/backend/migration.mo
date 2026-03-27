import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

module {
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

  type UserProfile = {
    name : Text;
    phone : Text;
  };

  type OldActor = {
    resources : Map.Map<Nat, Resource>;
    bookings : Map.Map<Nat, Booking>;
    blockedSlots : Map.Map<Nat, BlockedSlot>;
    coupons : Map.Map<Text, Coupon>;
    userProfiles : Map.Map<Principal, UserProfile>;
    resourceIdCounter : Nat;
    bookingIdCounter : Nat;
    blockedSlotIdCounter : Nat;
  };

  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
