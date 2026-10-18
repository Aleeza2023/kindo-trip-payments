# AI Workings

## Tools I used
- **Claude Code (VS Code)** – My main AI coding agent. I used it to plan development steps, write code and tests, review the implementation, and explain technical concepts I wasn't fully familiar with, such as why payment amounts should be stored in cents.

- **Claude (claude.ai)** – I used it for a second opinion and to refine some of my prompts and agent instructions, making them more specific and providing clearer context for Claude Code.

- **ChatGPT** – I used it to explore frontend design ideas, plan the user flow, and create visual designs for the application screens.

## 2. How I Worked with Claude Code

I created [CLAUDE.md](CLAUDE.md) before starting development to give Claude Code clear instructions about the project structure, architecture, payment rules, and how I wanted it to work with me.

- I asked Claude Code to show me a plan before making any code changes and wait for my approval.
- I wanted to work in small steps rather than develop the entire application at once.
- After each step, I asked it to explain what was implemented, why it was needed, how it worked, and what could go wrong.
- I encouraged the agent to question my decisions and suggest better approaches when appropriate.
- I asked it to review the backend first, then the frontend, and finally the complete application to identify bugs, inconsistencies, and possible improvements.
- I reviewed the suggested changes before approving them.
- I instructed Claude Code not to make Git commits, as I wanted to review the changes and commit them myself.



## 3. Key Prompts and Instructions

These are some of the main prompts and instructions I used while developing the application with Claude Code.

### 3.1 Planning and Development

> Before writing code, review the requirements, show me your development plan and explain how you will implement each part. Wait for my approval, then develop the application step by step. Follow the architecture and coding rules in CLAUDE.md.

### 3.2 Restoring the Legacy Payment Code

The legacy payment code was copied from the challenge PDF, which caused broken indentation, line breaks and some split words.

I used Claude (claude.ai) to help refine the instructions so Claude Code could restore the file without changing the original payment logic.

> The file backend/app/legacy_payment.py was copied from a PDF. The indentation and line breaks are broken. Restore it to valid Python with 4-space indentation.
>
> Rules:
> - Change only whitespace and line breaks.
> - Do not change names, strings, numbers, comments, logic or the order of statements. Keep the code exactly as written, including any bugs.
> - Do not add type hints, docstrings or imports. Do not run a formatter such as black or change quote styles.
> - If the PDF merged a comment into the line before it, split it onto two lines.
> - When finished, list every change that was not purely indentation.

### 3.3 Frontend Design and Responsiveness

> Create a responsive interface suitable for laptops, tablets and mobile devices. Show me your plan first. Don't change any code yet.

> Use the image I uploaded to the assets folder for the main screen.

I also used ChatGPT to explore the design and user flow for the four screens: Trip Details, Child Registration, Payment and Confirmation.

### 3.4 Reviewing the Code

After developing the backend, I asked Claude Code:

> Review the complete backend, including comments, and explain each file and its assumptions.

Later, I asked it to review the frontend and the complete application:

> Review the whole frontend, and then review the complete application for inconsistencies. Don't change any code yet. Just show me a list of suggestions.

I also wanted to understand whether the architecture could support future changes:

> Would this architecture be easy to maintain or extend for multiple schools and trips? Don't refactor anything unless there is a clear reason. Explain your findings first.

### 3.5 Reviewing and Simplifying Tests

I asked Claude Code to check whether the tests covered the main functionality and important edge cases.

> Focus on the registration process, validation, payment processing, duplicate payments, API errors and loading states.
>
> Run the existing tests and report the results. If anything fails, explain why.

Later, I asked:

> Are the important business rules and payment scenarios properly tested? Check whether there are duplicate tests, missing edge cases or tests that don't provide much value.

When reviewing the test suite, I wanted to avoid unnecessary tests:

> Remove duplicated and unnecessary tests. Keep the tests focused on the main functionality. Before removing anything, show me the list and explain why. No code edits without my review.

I reviewed the suggested changes before approving them.

## 4. Things I Checked Rather Than Simply Trusting AI

### 4.1 Restoring the Legacy Payment Code

Claude Code fixed formatting problems introduced when the legacy payment code was copied from the PDF.

It removed three PDF page footers and rejoined words that had been split across lines, for example:

- `floa` / `t` → `float`
- `random.rand` / `int` → `random.randint`
- `"Must be 1"` / `"6 digits."` → `"Must be 16 digits."`

It also flagged two assumptions where text had wrapped inside strings, including `"Missing required field: {field}"` and `"Payment declined by processor. Please try again."`

**How I verified it:** Claude Code ran `python -m py_compile` to check that the file compiled. I also reviewed the reported changes before accepting them.

I deliberately kept the original legacy payment logic unchanged, including the 10% random failure behaviour.

### 4.2 Identifying Students by ID Instead of Name

Claude Code's initial plan identified a student using their name and trip. It suggested student IDs as a future improvement.

I questioned this because two students can have the same name.

I decided to create a sample student table with a unique student ID, school ID and room number. This allows two students named "Sam Lee" to be identified separately.

**Checking the student name as well:**

While manually testing the application as a parent, I questioned whether the student ID alone was sufficient.

I decided to keep the student's name as an additional confirmation check. The student ID identifies the child, while the name helps catch mistakes when entering an ID.

This reduces the chance of accidentally registering the wrong student, although proper parent authentication and authorisation would still be needed in a real application.

### 4.3 Storing Payment Amounts in Cents

Initially, I suggested storing the trip cost as a float because storing money in cents seemed confusing.

Claude Code recommended using integer cents instead. I questioned this and asked for practical examples.

For example, floating-point arithmetic can produce unexpected results:

`10.10 + 9.89 == 19.99` can return `False`.

This could create problems when comparing payment amounts.

After understanding the reason, I decided to keep amounts as integer cents in the database and business logic.

### 4.4 Displaying Payment Amounts to Parents

Although prices are stored in cents internally, I questioned whether parents would see values such as `2500` instead of `$25.00`.

We kept cents in the database to avoid floating-point precision problems, while the API returns a formatted dollar string such as `"25.00"`.

The amount is converted to a float only in `payment_gateway.py`, because the legacy payment processor expects that format.

### 4.5 Removing Unnecessary Data from the API Response

While manually reviewing the models and API responses, I noticed that `school_id` was included in the trip response even though the frontend didn't need it.

I removed it to keep the API response focused on the information required by the frontend.

### 4.6 Choosing Registration IDs

Claude Code asked whether I wanted sequential registration IDs or UUIDs.

It recommended UUIDs because registration IDs appear in URLs and there was no login system in the prototype.

I agreed that UUIDs were more appropriate because they are harder to guess than sequential numbers.

However, UUIDs are not a replacement for access control, so I listed parent authentication as a future improvement.

### 4.7 Choosing Which Transaction Number to Display

The confirmation page initially displayed a long internal transaction ID.

I questioned why parents needed to see it, especially when a successful payment also had a reference returned by the legacy processor.

Each payment attempt has an internal ID because even declined attempts need to be recorded. Successful payments also receive a `TX-...` reference from the legacy processor.

I decided to keep the internal ID for database records and display only the processor's reference to parents, labelled **Transaction number**.

This makes the confirmation screen simpler and easier to understand.
## 5. Mistakes and Problems Identified During AI-Assisted Development

### 5.1 Creating a Lock Before Checking the Registration

Claude Code initially implemented `pay()` so that it created a lock before checking whether the registration ID existed.

During a full backend review that I requested, Claude Code identified a problem: requests with made-up registration IDs could create unnecessary locks in memory. Repeated requests with invalid IDs could therefore increase memory usage.

I asked Claude Code to correct the order:

1. Check whether the registration exists.
2. Acquire the lock.
3. Re-read the registration status before processing payment.

I also asked it to add a test confirming that an invalid registration ID does not create a lock.

**What I learned:** The existing tests checked whether the locking mechanism worked, but they didn't check whether unnecessary locks were being created. Reviewing the code beyond the existing tests helped identify this issue.

### 5.2 Frontend Consistency Issues

I asked Claude Code to review the entire application for consistency. It identified four issues in code it had generated:

1. **Different application names:** The browser tab displayed "Kindo Trip Payments", while the page header displayed "Kindo School Payments".

2. **Inconsistent colours:** Information messages used indigo, while the rest of the application used blue.

3. **Incorrect accessibility roles:** An informational message such as "Already registered, please continue" used `role="alert"`, which could cause screen readers to interrupt users unnecessarily. I agreed that `role="status"` was more appropriate for informational messages.

4. **Inconsistent form structure:** The Student Information section used a visible `<legend>`, while the Parent/Guardian Information section used a hidden legend and a separate visible heading. Although both sections looked similar, they were implemented differently.

I reviewed these findings, approved the corrections and manually checked the code afterwards.

**What I learned:** These issues did not break the main functionality, and the tests passed. However, they showed that passing automated tests does not necessarily mean the interface is consistent or accessible.


## 6. Manual Usability Checks and Improvements

After implementing the main functionality, I tested the complete application in the browser from a parent's perspective.

I went through the four screens: Trip Details, Child Registration, Payment and Confirmation. I wanted to check whether the instructions, messages and overall flow were easy to understand.

During this review, I noticed some wording and usability issues that I wanted to improve.

### 6.1 Manualy Improving Messages

Some of the messages generated by Claude Code felt too long or unclear.

I manually revised:
- The subtitle on the Payment screen to make its purpose clearer.
- The "Already paid" message on the Registration screen to make it easier for parents to understand.
- Payment error messages to make them shorter and more helpful.


### 6.2 Making Required Fields Clearer

While testing the registration form, I noticed that required fields were not clearly indicated.

I asked Claude Code to add a red asterisk (*) next to:
- Student ID
- Student Name
- Parent/Guardian Name

I also asked it to include a short explanation that * indicates a required field.

This makes it easier for parents to identify which information they must provide before continuing.

### 6.3 Reviewing the Overall User Flow

I manually checked the navigation between Trip Details, Registration, Payment and Confirmation.

My focus was on whether the steps followed a natural order, the buttons were easy to understand, and parents received appropriate feedback when something went wrong.

It flagged me that there are two "Back" buttons(one as a link and other Butoon next to Back) which i feel does not need it. 





