# Purchase Bill Upload Plan

## Goal

Allow a user to attach an optional bill image when recording a supplier purchase.

The work will be released one module at a time. Each module will be tested and approved before work starts on the next module.

The feature must stay hidden by default so users who do not need it keep the simple purchase form.

## Shared rules

- Use the existing `ImageUpload` and Cloudinary upload flow.
- Upload images to `poultry360/purchase-bills`.
- Support image files only, up to 10 MB.
- Bill upload is optional.
- Do not allow the purchase to be saved while the bill is uploading.
- Show a preview before saving.
- Show a **View** link in purchase history after saving.
- A missing bill must never stop a purchase.
- A bill must not change balances, stock, expenses, feed, FCR, or payment values.
- Each module gets its own user-controlled setting, defaulted to off.
- Admin does not control the user setting.

## Phase 1 — Farmer

Status: **Implemented and approved for the next phase**

### Current implementation

- Farmer Settings has a **Purchase bill upload** toggle slider.
- The toggle is off by default.
- When off, the upload field and Bill column are hidden.
- When on, the Farmer purchase form shows an optional bill image upload.
- The purchase table shows a Bill column with a View link.
- The existing `EntityTransaction.imageUrl` field stores the bill URL.
- No Prisma migration is required.
- The backend still accepts old purchase requests without `imageUrl`.

### Manual test checklist

1. Confirm the setting is off for a Farmer with no saved feature row.
2. Confirm the purchase form and table have no bill UI while off.
3. Turn the setting on from Farmer Settings.
4. Record a purchase without a bill.
5. Record a purchase with a JPG or PNG bill.
6. Confirm upload progress and preview work.
7. Confirm save and close are blocked while upload is running.
8. Reload the supplier ledger and open the saved bill.
9. Test Feed, Medicine, Chicks, and Other purchases.
10. Confirm stock, supplier balance, expense, and purchase totals are correct.
11. Turn the setting off and confirm the upload field and Bill column disappear.
12. Turn it on again and confirm old bill links return.

### Approval rule

Do not start Phase 2 until the Farmer flow passes manual testing.

## Phase 2 — Hatchery

Status: **Implemented and approved for the next phase**

### Current implementation

- Hatchery Settings has a Hatchery-owned toggle, off by default.
- Staff cannot change the Hatchery setting.
- The purchase form shows the shared optional bill upload only when enabled.
- Purchase save and close actions are blocked while a bill is uploading.
- The bill URL is stored in `HatcherySupplierTxn.receiptImageUrl`.
- Purchase history shows a View bill link only when the feature is enabled.
- Payment receipt upload is unchanged.
- Old purchase requests without a bill still work.
- No Prisma migration is required.

### Manual test checklist

1. Open Hatchery Settings and confirm the toggle is off by default.
2. Confirm the purchase form and history have no bill UI while it is off.
3. Turn the setting on and record a purchase without a bill.
4. Record a purchase with a JPG or PNG bill.
5. Confirm upload progress and preview work.
6. Confirm save and close are blocked while upload is running.
7. Reload the supplier ledger and open the saved bill.
8. Test a multi-item purchase.
9. Test Feed, Medicine, Chicks, Raw Material, and Other purchases.
10. Confirm stock, supplier balance, free chicks, and purchase totals are unchanged.
11. Turn the setting off and confirm upload and View bill are hidden.
12. Turn it on again and confirm saved bill links return.

## Phase 3 — Dealer

Status: **Implemented and approved for the next phase**

### Current implementation

- Dealer Settings has a Dealer-owned toggle, off by default.
- Admin does not control this setting.
- The Manual Company purchase form supports an optional bill image.
- Bulk Reorder supports the same optional bill image.
- Purchase save and close actions are blocked while the bill uploads.
- The bill URL is saved in nullable `DealerManualPurchase.billImageUrl`.
- The Manual Company account page shows a View bill link when enabled.
- Old purchases remain valid with a null bill URL.
- Migration `20261001115141_add_purchase_bill_fields` includes the nullable Dealer field.

### Required migration step

Review and apply the existing migration before manual testing.

### Manual test checklist

1. Confirm the Dealer setting is off by default.
2. Confirm both purchase forms and purchase history hide bill controls while off.
3. Turn the setting on in Dealer Settings.
4. Record a Manual Company purchase without a bill.
5. Record one with a JPG or PNG bill.
6. Record a Bulk Reorder purchase with a bill.
7. Confirm save, close, back, and cancel are blocked during upload.
8. Open the Manual Company account and use the View bill link.
9. Confirm inventory, supplier balance, totals, discounts, and expiry values are unchanged.
10. Turn the setting off and confirm bill controls and links are hidden.
11. Turn it on again and confirm old saved bill links return.

## Phase 4 — Company

Status: **Implemented, waiting for migration and manual approval**

### Current implementation

- Company Settings has a Company-owned toggle, off by default.
- Admin does not control this setting.
- Add Purchase supports an optional bill image.
- Reorder supports the same optional bill image.
- Purchase save and dialog close actions are blocked while a bill uploads.
- The bill URL is saved in nullable `CompanyPurchase.billImageUrl`.
- Supplier purchase history shows a Bill column only when enabled.
- Old purchases remain valid with a null bill URL.
- Migration `20261001115141_add_purchase_bill_fields` includes the nullable Company field.

### Required migration step

The existing migration contains only these safe nullable columns:

```sql
ALTER TABLE "public"."CompanyPurchase" ADD COLUMN "billImageUrl" TEXT;
ALTER TABLE "public"."DealerManualPurchase" ADD COLUMN "billImageUrl" TEXT;
```

Apply it before manual testing. Migration status could not be checked because the local database was not running.

### Manual test checklist

1. Confirm the Company setting is off by default.
2. Confirm Add Purchase, Reorder, and supplier history hide bill controls while off.
3. Turn the setting on in Company Settings.
4. Record a purchase without a bill.
5. Record a purchase with a JPG or PNG bill.
6. Record a Reorder purchase with a bill.
7. Confirm save, close, and cancel are blocked during upload where applicable.
8. Open the supplier ledger and use the View bill link.
9. Confirm stock, supplier balance, totals, rates, and raw-material values are unchanged.
10. Turn the setting off and confirm bill controls and the Bill column are hidden.
11. Turn it on again and confirm old saved bill links return.

## Phase 5 — Final cleanup

- Check every purchase entry point and shortcut in all modules.
- Keep labels, upload limits, folder names, and View actions consistent.
- Add safe cleanup for abandoned Cloudinary uploads.
- Add safe cleanup when a purchase with a bill is deleted or voided.
- Confirm exports include bill URLs only where useful.
- Run module tests and manual checks again before production release.

## Current known limit

Cloudinary files are not deleted when an uploaded image is removed, a form is cancelled, or a purchase is deleted. This matches the older payment receipt flow. Cleanup is planned for Phase 5 to avoid adding extra risk during the first module test.
