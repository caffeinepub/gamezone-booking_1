# GameZone Booking System

## Current State
New project — no existing application files.

## Requested Changes (Diff)

### Add
- Full gaming parlour booking system for 8 Ball Pool, PS4, PS5
- Role-based auth: customer accounts + admin panel
- Real-time slot availability with double-booking prevention
- Booking flow: select game → date/time → duration → confirm
- Admin dashboard: today's bookings, revenue stats, active sessions
- Resource management: tables/consoles with per-unit pricing
- Dynamic pricing: peak hours (evenings), weekends
- Slot blocking for maintenance/private use
- Cancellation system with time-based rules
- Offers/coupons (happy hours, first booking)
- Analytics: popular games, busy time slots, revenue trends

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan

### Backend (Motoko)
- User auth via authorization component (customer + admin roles)
- Resources: pool tables, PS4 units, PS5 units with name/pricing
- Bookings: userId, resourceId, startTime, durationMins, status, paymentMethod, totalAmount, couponCode
- Slot availability query: given resourceType + date, return booked slots with buffer
- Double booking lock: atomic booking creation with conflict check
- Dynamic pricing: base price × multiplier based on hour + weekday/weekend
- Blocked slots: admin can block time ranges on any resource
- Cancellation: check hours until booking → allow/deny refund
- Coupons: code → discount percentage, valid/expired flag
- Admin APIs: CRUD resources, view/edit bookings, set pricing rules, analytics queries

### Frontend
- Homepage with hero + 3 game cards (8 Ball Pool, PS4, PS5)
- Multi-step booking flow: game → date/time slots → duration → payment method → confirmation
- Real-time slot grid: available (green) / booked (gray) / selected (purple)
- My Bookings page: upcoming + past, cancel button
- Admin panel (role-gated): dashboard, resources, bookings table, pricing settings, analytics charts
- Login/signup modal
