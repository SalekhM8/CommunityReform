# Cal.com Setup Guide — Childcare Enquiry Form

This document describes how the childcare enquiry form (`childcare-enquiry.html`) is
connected to Cal.com, **what is already configured**, and how to change it.

> **Status: live and configured** (19 October 2026, account `crcic`).
> The form is booking real appointments; nothing below needs doing again.

Everything happens automatically, with no server to maintain and no monthly cost:

| What happens | Handled by |
| --- | --- |
| Parent picks a slot that is genuinely free | Cal.com availability API |
| Double bookings are impossible | Cal.com (slot is checked again on submit) |
| Parent receives a confirmation email | Cal.com |
| `info@crcic.co.uk` is notified of the new enquiry | Cal.com |
| Parent and team both get a reminder the day before | Cal.com workflows |
| Staff see all bookings, and can cancel/reschedule | Cal.com dashboard |

---

## 1. Current configuration (already done)

**Account**

| Setting | Value |
| --- | --- |
| Booking page | <https://cal.com/crcic> |
| Username | `crcic` |
| Account email (receives notifications) | `info@crcic.co.uk` |
| Timezone | Europe/London |
| Plan | Free (1 user, unlimited event types) |

**Event type (this is the bookable appointment "Link")**

| Setting | Value |
| --- | --- |
| Title | Childcare Support Appointment |
| Booking link | <https://cal.com/crcic/childcare-appointment> |
| Internal ID | `7551284` |
| Slug | `childcare-appointment` |
| Duration | 30 minutes |
| Slot interval | 30 minutes (slots on the hour and half hour) |
| Location | In person — 294 Edward Road, Birmingham, B5 7PH |
| Minimum notice | 4 hours |
| Booking window | 120 days ahead (matches the website) |
| Upcoming bookings per booker | 1 (a family cannot hold two slots at once) |
| Buffers | none, so appointments run back to back |

**Availability — schedule "Childcare appointments" (ID `2523206`)**

| Days | Hours |
| --- | --- |
| Monday – Thursday | 10:00 → 19:00 |
| Friday | 10:00 → 12:30 **and** 14:30 → 19:00 |
| Saturday – Sunday | not offered |

This is a *range* on purpose: Cal.com converts the range into individual 30-minute
appointment slots (last slot 18:30, or 18:30 Friday in both blocks). The website's
date picker only ever shows the free ones.

> The account's *default* schedule ("Working hours", Mon–Fri 9–5) is untouched and is
> used by the other event types in the account.

**Booking questions** — every answer is saved with the booking and included in the
notification email to `info@crcic.co.uk`:

Home address · Postcode · Children needing childcare · Employment status ·
Benefits received · What help is needed · Consent to privacy notice

(The form on the website maps to these field slugs in the `CALCOM.bookingFields`
block of `enquiry.js`. Phone numbers are converted to `+44…` before they are sent,
because Cal.com validates the number.)

**Automatic emails (Workflows)**

| Workflow | ID | Trigger | Action |
| --- | --- | --- | --- |
| Childcare appointment – reminder to parent | `489997` | 24 hours before event | email to attendee |
| Childcare appointment – reminder to team | `489998` | 24 hours before event | email to host (`info@crcic.co.uk`) |

Both are active **only** on the childcare event type, so the account's other event
types are unaffected.

**Website wiring** — the `CALCOM` block at the top of `enquiry.js`:

```js
const CALCOM = {
    username: 'crcic',
    eventTypeSlug: 'childcare-appointment',
    eventTypeId: null,            // leave as null
    timeZone: 'Europe/London',
    ...
```

Nothing in the website needs an API key: the form uses Cal.com's public endpoints
(`GET /v2/slots`, `POST /v2/bookings`), which work without authentication.

> **Note:** during the original setup an API key named *"Website enquiry form"* was
> created in Cal.com so the account could be configured through the API (schedules,
> event type, booking questions, reminders). The website does not use it and never
> has. It can be deleted whenever you like in **Cal.com → Settings → Developer →
> API keys** — nothing in the site or the booking flow depends on it.

---

## 2. Changing things later

Almost everything is a few clicks in <https://app.cal.com>:

| I want to… | Where |
| --- | --- |
| Change opening hours | **Availability → Childcare appointments** (weekday/time grid) |
| Change duration, buffers, notice, limits | **Links → Childcare Support Appointment → Limits / Advanced** |
| Change the questions parents are asked | **Links → Childcare Support Appointment → Advanced → Booking questions** |
| Change the address or description | **Links → Childcare Support Appointment → Basics** |
| Pause bookings temporarily | **Links → Childcare Support Appointment** → hide it (the website then shows no slots) |
| See or cancel bookings | **Bookings** |

Two limits to remember on the free plan:

- The **wording** of the reminder emails is Cal.com's own template. Custom text and
  SMS reminders need their paid Teams plan (~$12–16 per user/month). Timing and
  triggers are fully configurable.
- Only the account owner can log in. Staff share the login, or the team can move to
  Teams later for individual logins.

If you ever change the event type's **slug**, update `eventTypeSlug` in `enquiry.js`
to match, or the form will report that booking is unavailable.

---

## 3. Rebuilding from scratch (new account)

1. Create the free account at <https://app.cal.com/signup> with
   **`info@crcic.co.uk`**, and connect a calendar (Google/Outlook/Apple).
   Notifications and reminders go to whoever owns the event type.
2. Set the timezone to **Europe/London** (Settings → General).
3. Create an availability schedule for the opening hours in section 1.
4. Create the event type under **Links → New**: title, slug, 30 minutes, in-person
   address, and the schedule from step 3.
5. Under **Limits/Advanced**: slot interval 30, minimum notice 4 h, 120-day booking
   window, 1 upcoming booking per booker, and the booking questions from section 1.
6. Create the two workflows (24 h before event; email attendee / email host).
7. Put the username and slug into `enquiry.js` and run the test in section 4 below.

> In the current Cal.com interface, **Links** is what used to be called "Event
> Types" — that is where bookable appointments live. The separate **Events**
> section is for one-off scheduled events (fixed start/end, registration, guests);
> it does *not* produce appointment slots and must not be used for this.

---

## 4. Test it end to end

1. Open `childcare-enquiry.html` (locally: `python3 -m http.server 8080` then
   <http://localhost:8080/childcare-enquiry.html>).
2. Complete the form with your own details, choose a slot, and submit.
3. Check that:
   - [ ] The green confirmation panel shows a reference (`uid`)
   - [ ] The parent's email receives a confirmation
   - [ ] `info@crcic.co.uk` receives the notification with all the answers
   - [ ] The booking appears under **Bookings**
   - [ ] That exact slot disappears from the website on reload
4. Cancel the test booking in Cal.com so the slot is freed up again.

Verified on 19 October 2026 during setup: the website created a real booking, the
answers were stored on it, the booked slot disappeared from availability, and the
booking was then cancelled again.

---

## 5. Troubleshooting

**The date field says "Online booking isn't switched on yet."**
`username` or `eventTypeSlug` in `enquiry.js` is empty.

**No appointment times appear.**
Check the event type is not hidden, the availability schedule is assigned to it, the
timezone is Europe/London, and the booking window has not been reached (120 days).
The browser console (F12) shows the exact Cal.com error.

**"Event Type not found"**
The slug in `enquiry.js` no longer matches the event type's URL (it is
case-sensitive).

**A parent cannot submit at all and Cal.com mentions `invalid_number`.**
The phone number did not survive validation. `normalisePhone()` in `enquiry.js`
converts UK numbers (`07123 456789`, `+44 (0)7123…`, `+44 7123…`, `0044…`) to `+44…`;
genuinely unusual numbers should be checked by phone instead. The form now shows
"Please check this phone number" and highlights the field.

**The parent is told "This email address already has an appointment booked with us."**
Cal.com's repeat-booking limit (`maximumActiveBookings: 1`) is doing its job: that email
address already holds an active appointment. They can reschedule from the link in their
confirmation email, or you can change the limit in Cal.com → event type → Limits.
This is also what you will see if you test twice with the same email address without
cancelling the first booking.

**A booking fails with a message about a taken slot.**
That is the double-booking protection working — the form refreshes the list and
asks the parent to choose again.

**The parent is told "We could not send your answers through automatically just now."**
Cal.com rejected one of the booking questions (`Missing required booking field response…`).
That means a question was renamed or deleted in Cal.com, or a new required question was
added. Compare Cal.com → event type → Advanced → Booking questions with the
`bookingFields` map in `enquiry.js` (their slugs must match). The form logs the exact
Cal.com message to the browser console (F12).

**"We could not book that appointment automatically."**
Catch-all for any other Cal.com rejection. The exact status and message is logged to the
browser console (F12) — check there first. Common causes: a question type changed in
Cal.com, or the event type was made unavailable mid-session.

**Nothing arrives by email.**
Check Cal.com → Settings → My account → Notifications (email toggles), and the spam
folder. Booking emails come from `notifications@cal.com`; mark it as "not spam".

---

## 6. Data protection summary (for your records)

- Parent details are stored in Cal.com's booking records and included in the email
  notifications to `info@crcic.co.uk`.
- Cal.com acts as a **processor** under a Data Processing Agreement that applies
  automatically to all accounts, free or paid.
- Data is processed in the United States; the transfer is covered by the
  **UK Extension to the EU–US Data Privacy Framework** and the **UK Addendum to the
  EU Standard Contractual Clauses**.
- The privacy notice on `privacy.html` tells parents this, in plain English. Review
  it with your own adviser before you go live, and adjust the retention period if
  your policy differs.
- No documents, bank details, or benefit account logins are ever requested by this
  form — keep it that way.
