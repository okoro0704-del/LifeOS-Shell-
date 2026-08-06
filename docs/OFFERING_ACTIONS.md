# Offering Actions

Each `DiscoverableOffering` declares `capabilities`:

VIEW, BOOK, BUY, RESERVE, PAY, JOIN, CHECK_IN, CANCEL, WAITLIST, SAVE, OPEN_EXPERIENCE, PURCHASE_TICKET

LifeOS never assumes every offering is bookable. Capabilities come from the offering projection (future: source system).

Primary CTA is derived from capabilities (e.g. tickets → Buy ticket, classes → Join).
