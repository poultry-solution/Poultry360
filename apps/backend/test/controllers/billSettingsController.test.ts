jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    user: { findUnique: jest.fn() },
    billSettings: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  return { __esModule: true, default: client };
});

import prisma from "../../src/utils/prisma";
import { getBillSettings, updateBillSettings } from "../../src/controller/billSettingsController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

const request = (body: Record<string, unknown> = {}) => ({ body, userId: "owner-1" } as any);

const farmer = {
  role: "OWNER",
  name: "Ramesh",
  phone: "+9779800360011",
  companyName: "Green Valley Poultry Farm",
  CompanyFarmLocation: "Bharatpur-16, Chitwan",
  dealer: null,
  company: null,
  hatcheryBusiness: null,
};

const dealer = {
  role: "DEALER",
  name: "Suresh Demo Dealer",
  phone: "+9779800360021",
  companyName: null,
  CompanyFarmLocation: null,
  dealer: { name: "Shree Ganesh Feed Center", address: "Narayangadh, Chitwan", contact: "9800360021" },
  company: null,
  hatcheryBusiness: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  db.billSettings.findUnique.mockResolvedValue(null);
});

describe("GET /bill-settings", () => {
  it("uses the farm name, location and phone when nothing is saved", async () => {
    db.user.findUnique.mockResolvedValue(farmer);
    const res = makeResponse();
    await getBillSettings(request(), res);

    const { effective, saved } = res.json.mock.calls[0][0].data;
    expect(saved.businessName).toBeNull();
    expect(effective).toEqual({
      businessName: "Green Valley Poultry Farm",
      address: "Bharatpur-16, Chitwan",
      phone: "+9779800360011",
      panNumber: null,
      footerNote: null,
    });
  });

  it("falls back to the person's name when a farmer has no farm name", async () => {
    db.user.findUnique.mockResolvedValue({ ...farmer, companyName: null });
    const res = makeResponse();
    await getBillSettings(request(), res);
    expect(res.json.mock.calls[0][0].data.effective.businessName).toBe("Ramesh");
  });

  it("uses the dealer shop name, not the person's name", async () => {
    db.user.findUnique.mockResolvedValue(dealer);
    const res = makeResponse();
    await getBillSettings(request(), res);

    const { effective } = res.json.mock.calls[0][0].data;
    expect(effective.businessName).toBe("Shree Ganesh Feed Center");
    expect(effective.address).toBe("Narayangadh, Chitwan");
    expect(effective.phone).toBe("9800360021");
  });

  it("prints saved values over the defaults", async () => {
    db.user.findUnique.mockResolvedValue(dealer);
    db.billSettings.findUnique.mockResolvedValue({
      businessName: null,
      address: "Main Road, Narayangadh",
      panNumber: "123456789",
      phone: null,
      footerNote: "Thank you",
    });
    const res = makeResponse();
    await getBillSettings(request(), res);

    const { effective } = res.json.mock.calls[0][0].data;
    expect(effective.businessName).toBe("Shree Ganesh Feed Center");
    expect(effective.address).toBe("Main Road, Narayangadh");
    expect(effective.panNumber).toBe("123456789");
    expect(effective.footerNote).toBe("Thank you");
  });
});

describe("PUT /bill-settings", () => {
  beforeEach(() => db.user.findUnique.mockResolvedValue(farmer));

  it("saves trimmed values and empty fields as null", async () => {
    const res = makeResponse();
    await updateBillSettings(
      request({ businessName: "  ", address: " Bharatpur-10 ", panNumber: "123456789", phone: "", footerNote: "Thanks" }),
      res
    );

    expect(db.billSettings.upsert).toHaveBeenCalledWith({
      where: { accountId: "owner-1" },
      create: { accountId: "owner-1", businessName: null, address: "Bharatpur-10", panNumber: "123456789", phone: null, footerNote: "Thanks" },
      update: { businessName: null, address: "Bharatpur-10", panNumber: "123456789", phone: null, footerNote: "Thanks" },
    });
  });

  it("saves a +977 phone with 10 digits", async () => {
    const res = makeResponse();
    await updateBillSettings(request({ panNumber: "123456789", phone: "+9779812345678" }), res);
    expect(db.billSettings.upsert.mock.calls[0][0].update.phone).toBe("+9779812345678");
  });

  it.each([
    [{ panNumber: "12345678" }],
    [{ panNumber: "ABC123456" }],
    [{ panNumber: "1234567890" }],
    [{ panNumber: "787657897567890" }],
    [{ phone: "12ab" }],
    [{ phone: "9812345678" }],
    [{ phone: "+97798123" }],
    [{ phone: "+97798123456789" }],
    [{ phone: "+977981234567a" }],
    [{ phone: "21e4314398476314984083174" }],
    [{ businessName: "x".repeat(121) }],
    [{ footerNote: "x".repeat(201) }],
  ])("refuses %j", async (body) => {
    const res = makeResponse();
    await updateBillSettings(request(body), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.billSettings.upsert).not.toHaveBeenCalled();
  });
});
