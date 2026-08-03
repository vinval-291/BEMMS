# BEMMS — What the System Does

**Biomedical Equipment Management & Maintenance System**
General Hospital Lagos, Odan (GHL) — Clinical Engineering Department

This document explains every feature of the system in plain language. It is written for
hospital management and clinical engineering staff, not for programmers.

---

## 1. What BEMMS replaces

The Clinical Engineering Department traditionally records its work in a carbon-paper Work
Done Book: an engineer repairs a device on a ward, writes up what was done, and the ward
sister signs to confirm it. Those books are hard to search, easy to lose, and impossible to
report from.

BEMMS is a digital replacement for that book, plus the equipment register and maintenance
calendar that surround it. It runs in a web browser on a phone, tablet, or desktop, and it
can be installed onto a home screen like an ordinary app.

**Everything is shared and live.** When an engineer files a job on a ward, it appears
immediately on the department head's screen. There is one set of records, not one per
person.

---

## 2. Who can use it, and what they can do

Access is by named account only. There is no general login — a staff member cannot use the
system until an administrator has registered them.

There are three levels:

| Role | Who they are | What they can do |
| :--- | :--- | :--- |
| **Engineer** | Clinical field engineer | Register devices, file Work Done Book entries, view history, manage the maintenance calendar, run reports |
| **HOD** | Department head | Everything an engineer can do, plus register and manage engineer accounts |
| **Administrator** | System owner | Everything, plus manage HODs and other administrators |

**Boundaries that are enforced, not merely suggested:**

- An HOD cannot create an administrator, promote anyone to administrator, or alter an
  administrator's record.
- Engineers cannot see the User Management or Administration screens at all.
- Nobody can delete or deactivate their own account, so the department can never be locked
  out of its own system.

These rules are enforced by the database itself, not just hidden in the screen layout. A
user cannot bypass them by manipulating the app.

---

## 3. The eight screens

### Dashboard
The department's status at a glance, updating live:

- Total devices, how many are active, and how many are under repair
- Completed and outstanding jobs
- Preventive maintenance visits now due
- Which wards generate the most repair work
- Which categories of device fail most often
- Repair activity across the twelve months of the year
- Recurring words in reported faults (for example "battery" or "calibration"), useful for
  spotting a pattern across many separate jobs

### Equipment Registry
The master list of every medical device the department is responsible for. Each record
holds the device name and category, manufacturer, model and serial numbers, hospital asset
number, the ward it lives on, its installation, purchase and warranty expiry dates, its
current status, and optionally a photograph.

Devices are given readable identifiers automatically — `EQ-0001`, `EQ-0002`, and so on.

Each device gets a **QR code**. Print it, stick it on the device, and scanning it pulls up
that device's full record — useful when an engineer is standing in front of an unlabelled
machine on a ward.

You can search and filter the register, and open any device to see its complete profile.

### Work Done Book
The heart of the system, and the direct replacement for the paper book. To file an entry
the engineer records:

- Which device was worked on, and the type of work (corrective, preventive, calibration,
  installation, inspection, or upgrade)
- The fault as reported by the ward
- The technical work actually carried out
- The root cause of the failure
- Any spare parts consumed
- The outcome status of the job
- Optionally, photographs taken before and after the repair

**Two signatures are required.** The engineer signs, and the ward user who is accepting the
device back into service signs, giving their name, designation, and department. Both sign
on screen with a finger or a mouse.

> **The system will not accept an entry until both people have actually signed.** Signatures
> are never generated or filled in on anyone's behalf. This is what makes the record
> defensible in an audit.

Filing a job automatically updates the device's status in the register — so a device logged
as awaiting spare parts immediately shows that way to everyone.

Jobs are numbered `JOB-2026-0001` and upward, and numbers are allocated so that two
engineers filing at the same moment can never overwrite each other's work.

### Equipment History
Select any device and see its complete service life: every job ever filed against it, in
order, with the engineer's name and the signatures attached.

Filter by type of maintenance, by engineer, by ward, or by date range. This is what answers
questions like "how many times has this ventilator failed this year?" or "show me
everything this engineer serviced last quarter".

### PM Scheduler
Preventive maintenance planning. Schedule a device for a future visit at a chosen frequency
— monthly, quarterly, half-yearly, or annually — and assign it to an engineer.

The screen separates work into what is **overdue**, what is **due today**, and what is
**due this week**, calculated against the real current date. Mark a visit complete when it
is done.

### Reports
Monthly reporting for management and for compliance.

Pick a month and year and the system produces the totals for that period: jobs completed,
split by corrective, preventive, and calibration work, together with the spare parts
consumed.

Two outputs:

- **Export to CSV** — opens directly in Excel, for your own analysis or onward reporting
- **Print / Save as PDF** — a printable version of the report

### User Management
Where administrators and HODs register staff. Creating an account here sets up both the
person's sign-in credential and their profile in one step, and they can sign in
immediately.

You can also edit a staff member's details, send them a genuine password-reset email,
suspend their access, or remove them entirely.

**Suspending access** is the safe option and the one to reach for day to day: the account
is blocked from reading or writing anything, but the person's historical work stays in the
records where it belongs.

### Administration
Department configuration: the staff directory, the list of wards, and a **backup export**
that downloads a complete snapshot of the equipment register, the Work Done Book, the
maintenance schedules, and the staff directory as a single file you can archive off-system.

---

## 4. Working on a ward

The system is built for use away from a desk:

- **Works on a phone.** Every screen adapts to a small display; signatures are captured
  with a fingertip.
- **Installs like an app.** Add it to a phone or tablet home screen and it opens full
  screen, without browser toolbars.
- **Survives a weak signal.** The app itself is cached on the device, so it still opens in
  areas with poor connectivity. Records are held by the database and synchronise when the
  connection returns.

---

## 5. Security and record integrity

- **Named accounts only.** Every action is attributable to a person. Unregistered
  addresses cannot get in, even with a valid password.
- **Sign in with a hospital email and password, or with Google.**
- **Permissions enforced at the database.** Role restrictions are applied by the server on
  every single read and write.
- **Records carry their own history** — who created them and when, and when they were last
  changed.
- **Signatures cannot be forged by the system.** The software never draws, copies, or
  substitutes a signature.
- **Photographs are only ever the ones taken.** If no photograph was supplied, the record
  says so rather than showing a stand-in image.
- **Job numbers cannot collide,** so a maintenance record can never be silently overwritten
  by another.

---

## 6. Current limitations — please read

These are honest boundaries of the system as it stands today.

**Ward list is not yet saved.** Wards added on the Administration screen apply to the
current session only and are lost on refresh. The built-in ward list is always available.

**Suspending a user does not end a session already in progress.** They are blocked from
reading and writing immediately and cannot sign in again, but if they are actively using
the system at that moment their screen is not force-closed. For immediate hard removal,
suspend the account and have the person sign out.

**Suspended and deleted accounts keep their underlying sign-in credential.** The system
denies them access, but the credential itself remains until it is removed from the Firebase
console. Closing this gap fully requires an additional paid Firebase plan — see the
technical README.

**Estimated downtime is an estimate, not a measurement.** The Reports screen shows an
average downtime per job. The logbook records the date a job was filed but not how long a
device was actually out of service, so this figure is calculated from assumed durations
(4.5 hours for a corrective job, 1.5 for a preventive one). Treat it as a planning
indicator. If you want true downtime, the logbook would need to capture time out of service
and time returned.

**Reports cover one calendar month at a time.** There is no multi-month or annual roll-up
yet, though exported CSV files can be combined in Excel.

**Backups are manual.** The export on the Administration screen is run on demand by an
administrator; there is no automatic scheduled backup.

---

## 7. Getting started

1. The administrator signs in for the first time, which creates their account.
2. The administrator registers the department's HOD and engineers in **User Management**.
3. Engineers enter the existing equipment inventory in the **Equipment Registry**, printing
   and attaching QR labels as they go.
4. Preventive maintenance visits are set up in the **PM Scheduler**.
5. From then on, every job is filed in the **Work Done Book** as it happens.

The register is the foundation — a device must exist there before work can be logged
against it.

---

*System developed by V-Tech.*
