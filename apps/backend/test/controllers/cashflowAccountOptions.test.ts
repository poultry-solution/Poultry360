jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    cashAccount: { findMany: jest.fn() },
  };
  return { __esModule: true, default: client };
});
jest.mock("../../src/services/farmerCashflowService");
jest.mock("../../src/services/dealerCashflowService");
jest.mock("../../src/services/companyCashflowService");
jest.mock("../../src/services/hatcheryCashflowService");

import prisma from "../../src/utils/prisma";
import * as farmerService from "../../src/services/farmerCashflowService";
import * as dealerService from "../../src/services/dealerCashflowService";
import * as companyService from "../../src/services/companyCashflowService";
import { getAccountOptions as getFarmerAccountOptions } from "../../src/controller/farmerCashflowController";
import { getAccountOptions as getDealerAccountOptions } from "../../src/controller/dealerCashflowController";
import { getAccountOptions as getCompanyAccountOptions } from "../../src/controller/companyCashflowController";

import farmerRoutes from "../../src/router/farmerCashflowRoutes";
import dealerRoutes from "../../src/router/dealerCashflowRoutes";
import companyRoutes from "../../src/router/companyCashflowRoutes";

import * as hatcheryService from "../../src/services/hatcheryCashflowService";
import { getAccountOptions as getHatcheryAccountOptions } from "../../src/controller/hatcheryCashflowController";
import hatcheryRoutes from "../../src/router/hatcheryCashflowRoutes";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

const rows = [
  { id: "cash-1", name: "Cash", type: "CASH", archivedAt: null },
  { id: "bank-1", name: "NIC Asia Bank", type: "BANK", archivedAt: null },
];

beforeEach(() => {
  jest.clearAllMocks();
  db.cashAccount.findMany.mockResolvedValue(rows);
});

describe.each([
  ["farmer", getFarmerAccountOptions, farmerService],
  ["dealer", getDealerAccountOptions, dealerService],
  ["company", getCompanyAccountOptions, companyService],
  ["hatchery", getHatcheryAccountOptions, hatcheryService],
])("GET /%s/cashflow/account-options", (_role, handler, service) => {
  it("returns only active account names, with no balances", async () => {
    const res = makeResponse();
    await handler({ userId: "owner-1" } as any, res);

    expect((service as any).ensureCashAccount).toHaveBeenCalledWith("owner-1");
    expect(db.cashAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "owner-1", archivedAt: null },
        select: { id: true, name: true, type: true, archivedAt: true },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    const { accounts } = res.json.mock.calls[0][0].data;
    expect(accounts).toEqual(rows);
    expect(accounts[0]).not.toHaveProperty("balance");
  });
});

// The names-only list must sit before the Cash & Bank permission check, so a
// staff member without that permission can still pick Cash or Bank on payments.
describe.each([
  ["farmer", farmerRoutes],
  ["dealer", dealerRoutes],
  ["company", companyRoutes],
  ["hatchery", hatcheryRoutes],
])("%s cashflow router order", (_role, router) => {
  it("serves /account-options after the login check and before the permission check", () => {
    const stack = (router as any).stack as Array<{ route?: { path: string } }>;
    const optionsAt = stack.findIndex((l) => l.route?.path === "/account-options");
    const accountsAt = stack.findIndex((l) => l.route?.path === "/accounts");
    const middlewareBefore = stack.slice(0, optionsAt).filter((l) => !l.route).length;

    expect(optionsAt).toBeGreaterThan(-1);
    expect(middlewareBefore).toBe(1); // only the role login check
    expect(stack.slice(optionsAt, accountsAt).some((l) => !l.route)).toBe(true); // permission check comes after
  });
});
