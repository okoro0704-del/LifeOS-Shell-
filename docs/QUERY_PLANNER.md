# Query Planner

`planQuery(text, { prior?, inputType? })` produces a structured `CommandIntent` **without executing anything**.

## Example

Input: `Find me a massage tomorrow around 3pm under ₦40,000.`

```
type: DISCOVER | BOOK
category: Wellness
offeringType: MASSAGE
date: tomorrow
time: 15:00
maxPrice: 40000
currency: NGN
```

## Follow-ups

Sessions retain prior intent. Short follow-ups like `Cheapest`, `After 5pm`, `Book it` merge filters or prepare confirmation.

## Ambiguity

Consequential requests without enough entity (e.g. vague “Book something”) set `needsClarification` and return a clarifying question — never assume.
