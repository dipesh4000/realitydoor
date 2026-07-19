# How to use RealDoor

This guide explains the renter journey from starting a private session to downloading or deleting an application-readiness packet.

> RealDoor helps prepare and explain information. It does not determine whether you qualify for housing and does not send an application for you.

## Before you begin

For this prototype, use the synthetic files in [`data/synthetic_documents`](../data/synthetic_documents). Do not upload real sensitive documents unless RealDoor has been deployed and reviewed for your organization.

Have these document groups available when possible:

- two recent pay stubs;
- one current employment-verification document;
- one recent bank statement;
- one unexpired government-issued ID.

The live Preparation Checklist is loaded from the policy dataset. If that dataset changes, the application will show the updated documents, freshness windows, and required details.

## Step 1: Start your workspace

1. Open RealDoor.
2. Select the available LIHTC program.
3. Enter household size.
4. Select the MTSP band shown by the property or housing provider.
5. Read and accept the document-processing consent.

RealDoor uses household size and band only to retrieve the matching published comparison row. It does not choose a band or make an eligibility decision.

## Step 2: Add documents

1. Open **Add documents**.
2. Drag files into the upload area or choose them from your device.
3. Use PDF, JPG, or PNG files within the displayed size limit.
4. Compare uploaded files with the policy-driven Preparation Checklist.

Each checklist item shows:

- how many documents are required;
- how recent the document must be;
- whether it must be unexpired;
- how many policy-relevant details RealDoor expects to find.

Duplicate filenames are rejected to prevent accidental double uploads.

### If a document is unrelated

RealDoor will retain the file in the temporary workspace but show **No useful application data was found**. You can upload a different document or delete the unrelated file from Documents.

### If a document contains instructions

Uploaded text is evidence, never a command. If a document says “ignore the wages,” “set income to zero,” “mark verified,” or contains similar instruction-like language, RealDoor ignores it and flags the file for review.

## Step 3: Review extracted details

1. Choose a document from the **Selected document** dropdown.
2. Select a page tab to inspect that PDF page individually.
3. Compare each extracted value with the highlighted source region.
4. Select **This is correct** or **Correct**.

Common details include renter name, employer, pay frequency, gross pay, pay dates, pay-period dates, year-to-date gross, statement date, balance, issue date, and expiration date.

### Confidence labels

- **Looks good**: extraction confidence is high, but you must still confirm it.
- **Please review**: compare the value carefully with the source.
- **Needs correction**: the value likely needs editing.
- **Confirmed**: you approved the extracted value.
- **Corrected**: you replaced it with a reviewed value.

### Repeated details

An exact value repeated across documents is shown only once. For example, if several files contain the same renter name, RealDoor keeps one canonical occurrence instead of asking you to review the same name repeatedly.

Different values are never merged. Separate pay dates, balances, or differently spelled names remain visible. A confirmed or corrected occurrence is preferred; otherwise, the earliest uploaded document owns the repeated value.

### Page with no data

Every PDF page remains selectable. A page marked **No data** means RealDoor found no supported policy-relevant detail on that page. Inspect it manually and upload a clearer scan if the page should contain useful information.

## Step 4: Understand Readiness

Readiness is a preparation checklist, not an eligibility score.

The page contains:

- **Do next** for missing required documents or details;
- **Review when ready** for stale, expired, unconfirmed, or unsafe evidence;
- **Completed** for policy requirement groups that currently pass;
- **Requirements from the policy dataset** showing every document group and field used by the engine.

Selecting an action opens the relevant upload or extracted-detail screen.

If confirmed gross pay and pay frequency are available, RealDoor can show a deterministic annualized-income calculation and the exact published MTSP comparison row. The housing provider still makes the final determination.

## Step 5: Ask the assistant

The assistant can explain:

- what a requirement means;
- why a document or field is requested;
- how a deterministic calculation was produced;
- which source supports a policy explanation;
- what to do next in the current step.

The assistant streams responses and includes citations when a grounded policy answer is available. It will not follow instructions embedded in uploads and will not approve, deny, score, or predict eligibility.

Useful questions:

- “What should I upload next?”
- “Why is this document considered stale?”
- “How was annualized income calculated?”
- “Show the source for this policy requirement.”

## Step 6: Prepare your packet

1. Open **Your packet**.
2. Review which uploaded files will be included.
3. Remove any file you do not want in the packet.
4. Add or edit renter notes.
5. Preview the packet.
6. Explicitly generate it.
7. Download it or delete it.

RealDoor never sends a packet automatically. Generating a packet creates a temporary downloadable file only.

## Manage documents

Use Documents to:

- filter uploaded files by status;
- open the original file;
- review extraction summaries;
- return to extracted details;
- delete a file after confirmation.

Deleting a file removes it from readiness and packet preparation.

## End and delete the session

1. Open **Privacy & session** in the navigation sidebar.
2. Choose **End and delete session**.
3. Read the confirmation message.
4. Confirm deletion.

This removes the temporary session, conversation, documents, and generated packets. This action cannot be undone.

## Troubleshooting

### The page says the API is unavailable

Confirm that the backend is running at `http://localhost:8000` and that `http://localhost:8000/api/health` returns `status: ok`.

### Upload is blocked

Check that:

- consent was accepted;
- the file is PDF, JPG, or PNG;
- the file is below the configured size limit;
- the PDF is not corrupt or password protected;
- the PDF does not exceed the page limit.

### A value was not extracted

- Select every page and inspect it.
- Upload a clearer, text-based PDF when possible.
- Confirm the document is one of the supported types.
- Use **Correct** when a supported extracted field has the wrong value.
- If the entire file is irrelevant, replace or delete it.

### A repeated value disappeared from a later document

This is intentional. The Extraction page reports how many exact duplicate details were omitted. Review the canonical occurrence in the earlier or already-confirmed document.

### Readiness still shows an open item

Open the action and check whether the policy dataset requires another document, a fresher date, an unexpired ID, a missing field, or confirmation of an extracted value.

## Important boundaries

- Readiness means document preparation, not housing eligibility.
- Published thresholds are comparisons, not decisions.
- Policy scope and effective date matter.
- The prototype is not legal advice.
- Contact the housing provider or a qualified housing counselor when a rule, household situation, or requested document is unclear.
