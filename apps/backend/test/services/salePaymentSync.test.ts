import {
  laterPaymentsTotal,
  planInitialPayment,
} from "../../src/services/salePaymentSync";

const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const initial = (amount: number) => ({ id: "initial", amount, description: "Initial payment", createdAt: at("2026-10-01") });
const later = (id: string, amount: number) => ({ id, amount, description: "Payment received", createdAt: at("2026-10-05") });

describe("Sale payment sync on edit", () => {
  it("lowers the initial payment when a cash sale total goes down", () => {
    expect(planInitialPayment([initial(60000)], 59400)).toEqual({ action: "update", id: "initial", amount: 59400 });
  });

  it("does nothing when the paid amount already matches", () => {
    expect(planInitialPayment([initial(60000)], 60000)).toEqual({ action: "none" });
  });

  it("only moves the initial payment and leaves later payments alone", () => {
    const payments = [initial(10000), later("p2", 20000)];
    expect(laterPaymentsTotal(payments)).toBe(20000);
    expect(planInitialPayment(payments, 25000)).toEqual({ action: "update", id: "initial", amount: 5000 });
  });

  it("removes the initial payment when nothing was paid at sale time", () => {
    expect(planInitialPayment([initial(10000), later("p2", 20000)], 20000)).toEqual({ action: "delete", id: "initial" });
  });

  it("creates an initial payment when an unpaid sale becomes paid", () => {
    expect(planInitialPayment([], 5000)).toEqual({ action: "create", amount: 5000 });
  });

  it("does not create a zero payment", () => {
    expect(planInitialPayment([], 0)).toEqual({ action: "none" });
  });
});
