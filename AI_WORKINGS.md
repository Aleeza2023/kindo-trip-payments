# AI Workings

## Tools I used

- **Claude Code (in VS Code)** – my main tool. I used it to plan each step, write the code and tests, review the code, and explain things I didn't understand (why money is stored in cents).
- **Claude (claude.ai)** – to get a second opinion
- **ChatGPt - Design interface screens

## How I worked with the agent

- I wrote [CLAUDE.md](CLAUDE.md) first, so the agent followed my rules from the start: the layers, the payment rules (no card data stored, no double charges), "don't commit", and "teach me as you go".
- For each step I asked it to show me the plan first, and it only built after I agreed.
- After each step it had to explain why, how it works, and what could go wrong.
- I asked it to review the whole backend, and later the whole app.
- I read the changes and made the commits myself.

## Key prompts

### 1. Restoring the legacy code from the PDF

The file backend/app/legacy_payment.py was copied from a PDF. The indentation and line breaks are broken. Restore it to valid Python with 4-space indentation.

Rules: ( for writing rules i take help from claude.ai)
- Change only whitespace and line breaks.
- Do not change any names, strings, numbers, comments, logic, or the order of statements. Keep the code exactly as written, including any bugs.
- Do not add type hints, docstrings, or imports. Do not run a formatter such as black, and do not change quote styles.
- If the PDF merged a comment into the line before it (for example "integrate with# You should"), split it onto two lines.
- When you finish, list every change you made that is not pure indentation.

- Before writing code, review the requirements, show me your development plan and explain how you will implement each part. Wait for my approval, then develop the application step by step. Follow the architecture and coding rules in CLAUDE.md.


Create a responsive interface suitable for laptops, tablets and mobile devices. Show me your plan first. Don't change any code yet.

Use the image which i upload it in asset folder for the main Screen.


Focus on the registration process, validation, payment processing, duplicate payments, API errors and loading states.

Run the existing tests and report the results. If anything fails, explain why.

Before adding or removing tests, show me the proposed changes. I want to keep the test suite focused and maintainable.Remove all extra tests which are duplicated and extra checks which are not needed… main functionality should be tested only… before removing those tests show me the list. No code edits without my review.

I stayed with Tailwind and a few shared components, because the brief encourages Tailwind and the app only needs a handful of components.

Would this architecture be easy to maintain or extend for multiple schools and trips?

Are the important business rules and payment scenarios properly tested?

Check whether there are duplicate tests, missing edge cases or tests that don't provide much value.

Don't refactor anything unless there is a clear reason. Explain your findings first.
### Reviewing the code

> Review the complete backend… then later on Review the whole frontend. Then Review the whole app too. Diagnose inconsistencies. No code edits please. just show me list of suggestions.

## Things I checked rather than trusted

### Restoring the legacy code

- It removed 3 PDF page footers ("Kindo School Payments Challenge: Candidate Brief N") that had been pasted into the code.
- It rejoined words that the PDF had split across lines, for example:
  - `floa` / `t` → `float`
  - `random.rand` / `int` → `random.randint`
  - `"Must be 1"` / `"6 digits."` → `"Must be 16 digits."`
- **It flagged two assumptions:** where a line wrapped inside a string (`"Missing required field: {field}"` and `"Payment declined by processor. Please try again."`), it assumed the original had a space at the break.
- **Verified:** Claude Code ran `python -m py_compile` and the file compiles. I read through its list of changes before accepting the file.
- **Left as-is:** it left `if random.random() < 0.1:# 10% chance of failure` exactly as in the PDF, which I agreed with: the code must match what Kindo gave.


### Decisions where I questioned the AI 

- **Identifying children (name vs student ID):** Claude's first plan identified a child by name + trip, and listed a student ID only as a future improvement. I questioned it, because it wasn't accurate. I chose a seeded student list with school-provided IDs, and a student table with the ID, school ID and room number, so the two "Sam Lee" students are separate children.
- **Checking the name as well:** later I asked whether only the student ID should matter. The ID is what identifies the child; the name is only a confirmation step. A mistyped ID can't make a parent pay for someone else's child, and nobody can collect children's names by guessing IDs. So I kept the name check.
- **Money in cents:** I asked to store the cost as a float, because cents felt confusing. The agent pushed back, so I asked for real examples. `10.10 + 9.89 == 19.99` is `False` with floats, which would mark a fully paid child as unpaid. I decided to keep cents.
- **Money shown to parents:** the plan stored prices in cents. I questioned whether parents would see cents. We kept cents in the database (to avoid float rounding errors), and the API also returns a ready-formatted dollar string ("25.00"), so parents only ever see dollars.

- **Removing school_id:** while checking manually, I removed `school_id` from the trip response, because the frontend doesn't need it.
- **Registration IDs:** Claude Code asked whether to use random UUIDs or numbers, and recommended UUIDs because registration IDs appear in URLs and there's no login. I agreed: sequential numbers would let anyone guess other registrations. UUIDs are not real access control, so I listed parent login as a future improvement.
- **The reference number:** the confirmation page showed parents a long internal ID. I asked what it was for as two IDs on the reciepts will be confusing. Every attempt gets our own ID, because declines have no processor reference and we record every attempt. A successful payment also stores the processor's TX-… reference, which is what you'd use for refunds or checking against the payment provider. So I decided parents only see the TX number, labelled "Transaction number".


## Times the AI got something wrong


### A lock created before checking the registration exists

The agent wrote pay() to take a lock before checking that the registration was real. In a full review I asked for, the agent spotted that any made-up ID in the URL would add a lock to memory, so someone could fill memory by sending fake IDs. I had it check the registration exists first, then lock and re-read the status, and add a test that a fake ID creates no lock.


### Usability check in the browser: rewording messages myself

I ran through the whole flow in the browser myself, as a parent would. Some of the wording the agent had written didn't feel right, so I changed it by hand:

- **Payment page subtitle:** 
- **"Already paid" message on the registration page:** 
- **Required fields:** I wanted parents to see clearly which fields they must fill in,
  so I asked the agent to mark Student ID, student name and parent/guardian name with
  a red *, and to explain on the page that * means required.

I also shortened the payment error messages

### Consistency problems the agent introduced in the frontend

I asked Claude Code to review the whole app for consistency. It found four problems in code it had written itself:

1. **Two names for the app.** The browser tab said "Kindo Trip Payments" but the header said "Kindo School Payments".
2. **One colour out of place.** Info messages used indigo; everything else used blue.
3. **Info messages announced as alerts.** "Already registered, please continue" used role="alert", which makes screen readers interrupt. Only errors should do that; information should use role="status".
4. **Two form sections built differently.** "Student information" used a visible `<legend>`, but "Parent/guardian information" used a hidden legend plus a separate visible heading, to work around the divider line. Same look, different code.

None of these broke anything, and all the tests passed. 

- Parents see the processor's TX number as the "Transaction number", never our internal ID.
### A package that didn't suit my setup

It first installed jsdom 30, which needs a newer version of Node than mine. It noticed the warning and switched to jsdom 29, which works with my Node version.

## Cleaning up the tests

I asked the agent to list duplicate and non-essential tests and show me before removing any. I approved the list, and the tests reduced.


