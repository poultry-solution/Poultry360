import {
  buildFarmerInvoiceKey,
  generateNextFarmerInvoiceNumber,
} from "../../src/utils/invoiceNumber";

function transactionWithMax(maxNumber: string | null) {
  return {
    $queryRawUnsafe: jest
      .fn()
      .mockResolvedValueOnce([{ pg_advisory_xact_lock: null }])
      .mockResolvedValueOnce([{ max_num: maxNumber }]),
  };
}

describe("Farmer invoice numbers", () => {
  it("starts each Farmer account at INV-001", async () => {
    const firstFarmerTx = transactionWithMax(null);
    const secondFarmerTx = transactionWithMax(null);

    await expect(
      generateNextFarmerInvoiceNumber("farmer-a", firstFarmerTx as any)
    ).resolves.toBe("INV-001");
    await expect(
      generateNextFarmerInvoiceNumber("farmer-b", secondFarmerTx as any)
    ).resolves.toBe("INV-001");

    expect(buildFarmerInvoiceKey("farmer-a", "INV-001")).toBe(
      "farmer-a:INV-001"
    );
    expect(buildFarmerInvoiceKey("farmer-b", "INV-001")).toBe(
      "farmer-b:INV-001"
    );
  });

  it("continues the sequence for only that Farmer", async () => {
    const tx = transactionWithMax("9");

    await expect(
      generateNextFarmerInvoiceNumber("farmer-a", tx as any)
    ).resolves.toBe("INV-010");

    expect(tx.$queryRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("pg_advisory_xact_lock"),
      "farmer-sale-invoice:farmer-a"
    );
    expect(tx.$queryRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('JOIN "public"."Category"'),
      "farmer-a"
    );
  });

  it("trims custom invoice numbers in the hidden key", () => {
    expect(buildFarmerInvoiceKey("farmer-a", "  BILL-20  ")).toBe(
      "farmer-a:BILL-20"
    );
  });
});
