import { buildTransferLegs } from "../../../src/common/cashflow/transfer";

describe("buildTransferLegs", () => {
  it("returns two legs with opposite directions and the same shared transferId", () => {
    const [outLeg, inLeg] = buildTransferLegs({
      fromAccountId: "cash-1",
      toAccountId: "bank-1",
      amount: 300,
      bsDate: "2083-04-10",
      fromName: "Cash",
      toName: "NIC Main",
    });

    expect(outLeg.direction).toBe("OUT");
    expect(outLeg.accountId).toBe("cash-1");
    expect(outLeg.amount).toBe(300);
    expect(outLeg.partyName).toBe("Transfer to NIC Main");

    expect(inLeg.direction).toBe("IN");
    expect(inLeg.accountId).toBe("bank-1");
    expect(inLeg.amount).toBe(300);
    expect(inLeg.partyName).toBe("Transfer from Cash");

    expect(outLeg.transferId).toBe(inLeg.transferId);
    expect(outLeg.bsDate).toBe("2083-04-10");
    expect(inLeg.bsDate).toBe("2083-04-10");
  });

  it("honours an explicit transferId when the caller provides one", () => {
    const [a, b] = buildTransferLegs({
      fromAccountId: "cash-1",
      toAccountId: "bank-1",
      amount: 10,
      bsDate: "2083-04-10",
      fromName: "Cash",
      toName: "NIC",
      transferId: "fixed-id-42",
    });
    expect(a.transferId).toBe("fixed-id-42");
    expect(b.transferId).toBe("fixed-id-42");
  });

  it("rejects same-account transfers", () => {
    expect(() =>
      buildTransferLegs({
        fromAccountId: "cash-1",
        toAccountId: "cash-1",
        amount: 10,
        bsDate: "2083-04-10",
        fromName: "Cash",
        toName: "Cash",
      }),
    ).toThrow(/must differ/);
  });

  it("rejects non-positive amounts", () => {
    const base = {
      fromAccountId: "cash-1",
      toAccountId: "bank-1",
      bsDate: "2083-04-10",
      fromName: "Cash",
      toName: "NIC",
    };
    expect(() => buildTransferLegs({ ...base, amount: 0 })).toThrow(/positive/);
    expect(() => buildTransferLegs({ ...base, amount: -5 })).toThrow(/positive/);
    expect(() => buildTransferLegs({ ...base, amount: Number.NaN })).toThrow(/positive/);
  });
});
