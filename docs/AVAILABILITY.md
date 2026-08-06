# Availability

`AvailabilityProvider` interface:

- `getAvailability()`
- `getSlots()`
- `checkAvailability()`
- `slotPickerConfig()`

LifeOS does **not** duplicate HospitalityOS inventory logic. The mock provider is a discovery projection with a stale-slot warning. Confirm always re-checks.

`SlotPicker` is a shared configurable UI (datetime, daterange, showtime, class, party, quantity).
