import { ApiHelper } from "../helpers/api.helper";

describe("Farmer cash-in-hand API journey", () => {
  const api = new ApiHelper();
  const otherApi = new ApiHelper();
  const password = "Farmer-cash-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97797${suffix}`;
  const otherPhone = `+97798${suffix}`;
  let movementId: string | undefined;
  let todayBs: string | undefined;

  beforeAll(async () => {
    const [registration, otherRegistration] = await Promise.all([
      api.post("/auth/register", { name: `Cash API Farmer ${suffix}`, phone, password, role: "OWNER" }),
      otherApi.post("/auth/register", { name: `Other Cash API Farmer ${suffix}`, phone: otherPhone, password, role: "OWNER" }),
    ]);
    expect(registration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
    api.setAuthToken(registration.body.accessToken);
    otherApi.setAuthToken(otherRegistration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    expect((await otherApi.post("/test/approve-current-user")).status).toBe(200);
  });

  it("requires setup, tracks money in and out, locks a closed day, and keeps history private", async () => {
    const anonymous = new ApiHelper();
    expect((await anonymous.get("/farmer/cash-in-hand/today")).status).toBe(401);

    const beforeSetup = await api.get("/farmer/cash-in-hand/today");
    expect(beforeSetup.status).toBe(200);
    expect(beforeSetup.body.data.needsSetup).toBe(true);
    todayBs = beforeSetup.body.data.todayBs;

    const movementBeforeSetup = await api.post("/farmer/cash-in-hand/movements", {
      direction: "IN", amount: 10, partyName: "Buyer",
    });
    expect(movementBeforeSetup.status).toBe(400);

    expect((await api.post("/farmer/cash-in-hand/setup", { initialOpening: 100 })).status).toBe(201);
    expect((await api.post("/farmer/cash-in-hand/setup", { initialOpening: 200 })).status).toBe(409);
    expect((await api.post("/farmer/cash-in-hand/movements", { direction: "SIDE", amount: 10, partyName: "Buyer" })).status).toBe(400);
    expect((await api.post("/farmer/cash-in-hand/movements", { direction: "IN", amount: 0, partyName: "Buyer" })).status).toBe(400);
    expect((await api.post("/farmer/cash-in-hand/movements", { direction: "IN", amount: 10, partyName: "" })).status).toBe(400);

    expect((await api.post("/farmer/cash-in-hand/movements", {
      direction: "IN", amount: 50, partyName: "Chicken buyer", notes: "Cash sale",
    })).status).toBe(201);
    expect((await api.post("/farmer/cash-in-hand/movements", {
      direction: "OUT", amount: 20, partyName: "Feed shop", notes: "Cash purchase",
    })).status).toBe(201);

    const withMovements = await api.get("/farmer/cash-in-hand/today");
    expect(withMovements.body.data).toMatchObject({ needsSetup: false, opening: 100, closing: 130, isClosed: false });
    expect(withMovements.body.data.movements).toEqual(expect.arrayContaining([
      expect.objectContaining({ direction: "IN", amount: 50, partyName: "Chicken buyer" }),
      expect.objectContaining({ direction: "OUT", amount: 20, partyName: "Feed shop" }),
    ]));
    movementId = withMovements.body.data.movements.find((movement: { direction: string }) => movement.direction === "OUT")?.id;
    expect(movementId).toBeDefined();

    expect((await api.delete(`/farmer/cash-in-hand/movements/${movementId}`)).status).toBe(200);
    expect((await api.delete(`/farmer/cash-in-hand/movements/${movementId}`)).status).toBe(404);

    const close = await api.post("/farmer/cash-in-hand/close-day");
    expect(close.status).toBe(200);
    expect(close.body.data).toMatchObject({ bsDate: todayBs, opening: 100, closing: 150, alreadyClosed: false });
    expect((await api.post("/farmer/cash-in-hand/close-day")).body.data.alreadyClosed).toBe(true);

    const afterCloseMovement = await api.post("/farmer/cash-in-hand/movements", {
      direction: "IN", amount: 10, partyName: "Late buyer",
    });
    expect(afterCloseMovement.status).toBe(400);
    expect(afterCloseMovement.body.message).toContain("already closed");

    const [history, detail, otherDetail] = await Promise.all([
      api.get("/farmer/cash-in-hand/history?limit=1"),
      api.get(`/farmer/cash-in-hand/closed-day/${todayBs}`),
      otherApi.get(`/farmer/cash-in-hand/closed-day/${todayBs}`),
    ]);
    expect(history.status).toBe(200);
    expect(history.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ bsDate: todayBs, openingSnapshot: 100, closingSnapshot: 150, source: "USER", movementsCount: 1 }),
    ]));
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ bsDate: todayBs, openingSnapshot: 100, closingSnapshot: 150 });
    expect(detail.body.data.movements).toEqual([expect.objectContaining({ direction: "IN", amount: 50 })]);
    expect(otherDetail.status).toBe(404);
  });
});
