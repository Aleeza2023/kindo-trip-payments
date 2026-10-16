# AI Workings

## Key Prompts

### 1. Restoring the legacy code from the PDF

The file backend/app/legacy_payment.py was copied from a PDF. The indentation and line breaks are broken. Restore it to valid Python with 4-space indentation.

Rules:
- Change only whitespace and line breaks.
- Do not change any names, strings, numbers, comments, logic, or the order of statements. Keep the code exactly as written, including any bugs.
- Do not add type hints, docstrings, or imports. Do not run a formatter such
  as black, and do not change quote styles.
- If the PDF merged a comment into the line before it (for example
  "integrate with# You should"), split it onto two lines.
- When you finish, list every change you made that is not pure indentation.


## Things I checked rather than trusted


- **It had to do more than fix indentation, and it reported all of it:**
  - It removed 3 PDF page footers ("Kindo School Payments Challenge: Candidate Brief N") that had been pasted into the code.
  - It rejoined words that the PDF had split across lines, for example:
    - `floa` / `t` → `float`
    - `random.rand` / `int` → `random.randint`
    - `"Must be 1"` / `"6 digits."` → `"Must be 16 digits."`
- **It flagged two assumptions:** where a line wrapped inside a string (`"Missing required field: {field}"` and `"Payment declined by processor. Please try again."`), it assumed the original had a space at the break.
- **Verified:** Claude Code ran `python -m py_compile` and the file compiles. I read through its list of changes before accepting the file.
- **Left as-is:** it left `if random.random() < 0.1:# 10% chance of failure` exactly as in the PDF, which I agreed with: the code must match what Kindo gave.

I should Asking the agent to list every non-whitespace change is what made the result safe to accept.
