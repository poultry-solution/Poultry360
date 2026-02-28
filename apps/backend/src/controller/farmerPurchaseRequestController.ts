import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { FarmerPurchaseRequestService } from "../services/farmerPurchaseRequestService";

// ==================== FARMER CART: GET ====================
export const getFarmerCart = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;

    // Verify farmer-dealer connection
    const connection = await prisma.dealerFarmer.findFirst({
      where: { farmerId: userId, dealerId, archivedByFarmer: false },
    });
    if (!connection) {
      return res.status(403).json({ message: "You are not connected to this dealer" });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { id: true, name: true, contact: true, address: true },
    });

    let cart = await prisma.farmerCart.findUnique({
      where: { farmerId_dealerId: { farmerId: userId as string, dealerId } },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      cart = await prisma.farmerCart.create({
        data: { farmerId: userId as string, dealerId },
        include: { items: { include: { product: true } } },
      });
    }

    const total = cart.items.reduce(
      (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );

    return res.status(200).json({
      success: true,
      data: { ...cart, total, dealer },
    });
  } catch (error: any) {
    console.error("Get farmer cart error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER CART: ADD ITEM ====================
export const addItemToFarmerCart = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId, productId, quantity, unit } = req.body;

    if (!dealerId || !productId || !quantity) {
      return res.status(400).json({ message: "dealerId, productId, and quantity are required" });
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    // Verify connection
    const connection = await prisma.dealerFarmer.findFirst({
      where: { farmerId: userId, dealerId, archivedByFarmer: false },
    });
    if (!connection) {
      return res.status(403).json({ message: "You are not connected to this dealer" });
    }

    // Verify product belongs to this dealer
    const product = await prisma.dealerProduct.findFirst({
      where: { id: productId, dealerId },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found or does not belong to this dealer" });
    }

    if (Number(product.currentStock) < Number(quantity)) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}`,
      });
    }

    // Get or create cart
    let cart = await prisma.farmerCart.findUnique({
      where: { farmerId_dealerId: { farmerId: userId as string, dealerId } },
    });
    if (!cart) {
      cart = await prisma.farmerCart.create({
        data: { farmerId: userId as string, dealerId },
      });
    }

    // Upsert cart item
    const existingItem = await prisma.farmerCartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    let cartItem;
    if (existingItem) {
      const newQty = Number(existingItem.quantity) + Number(quantity);
      if (Number(product.currentStock) < newQty) {
        return res.status(400).json({
          message: `Insufficient stock. Available: ${product.currentStock} ${product.unit}, Already in cart: ${existingItem.quantity}`,
        });
      }
      cartItem = await prisma.farmerCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: new Prisma.Decimal(newQty) },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.farmerCartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: new Prisma.Decimal(quantity),
          unitPrice: product.sellingPrice,
          unit: unit || null,
        },
        include: { product: true },
      });
    }

    return res.status(201).json({ success: true, data: cartItem, message: "Item added to cart" });
  } catch (error: any) {
    console.error("Add item to farmer cart error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER CART: UPDATE ITEM ====================
export const updateFarmerCartItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || Number(quantity) <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const cartItem = await prisma.farmerCartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true },
    });
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    if (cartItem.cart.farmerId !== userId) {
      return res.status(403).json({ message: "Not your cart" });
    }

    if (Number(cartItem.product.currentStock) < Number(quantity)) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${cartItem.product.currentStock} ${cartItem.product.unit}`,
      });
    }

    const updated = await prisma.farmerCartItem.update({
      where: { id: itemId },
      data: { quantity: new Prisma.Decimal(quantity) },
      include: { product: true },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update farmer cart item error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER CART: REMOVE ITEM ====================
export const removeFarmerCartItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;

    const cartItem = await prisma.farmerCartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    if (cartItem.cart.farmerId !== userId) {
      return res.status(403).json({ message: "Not your cart" });
    }

    await prisma.farmerCartItem.delete({ where: { id: itemId } });
    return res.status(200).json({ success: true, message: "Item removed from cart" });
  } catch (error: any) {
    console.error("Remove farmer cart item error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER CART: CLEAR ====================
export const clearFarmerCart = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;

    const cart = await prisma.farmerCart.findUnique({
      where: { farmerId_dealerId: { farmerId: userId as string, dealerId } },
    });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await prisma.farmerCartItem.deleteMany({ where: { cartId: cart.id } });
    return res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error: any) {
    console.error("Clear farmer cart error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER CART: CHECKOUT ====================
export const checkoutFarmerCart = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;
    const { notes } = req.body;

    const cart = await prisma.farmerCart.findUnique({
      where: { farmerId_dealerId: { farmerId: userId as string, dealerId } },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate stock
    for (const item of cart.items as any[]) {
      if (Number(item.product.currentStock) < Number(item.quantity)) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.product.name}. Available: ${item.product.currentStock} ${item.product.unit}`,
        });
      }
    }

    // Find customer record for this farmer-dealer pair
    // The dealer's ownerId is needed to find the customer record
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { ownerId: true },
    });
    if (!dealer?.ownerId) {
      return res.status(400).json({ message: "Dealer has no owner account" });
    }

    const customer = await prisma.customer.findFirst({
      where: { farmerId: userId, userId: dealer.ownerId },
    });
    if (!customer) {
      return res.status(400).json({
        message: "No customer record found. Dealer connection may be incomplete.",
      });
    }

    const request = await FarmerPurchaseRequestService.createPurchaseRequest({
      farmerId: userId as string,
      dealerId,
      customerId: customer.id,
      items: cart.items.map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        unit: item.unit || undefined,
      })),
      notes: notes || undefined,
      date: new Date(),
    });

    // Clear cart
    await prisma.farmerCartItem.deleteMany({ where: { cartId: cart.id } });

    return res.status(201).json({
      success: true,
      data: request,
      message: "Purchase request sent to dealer",
    });
  } catch (error: any) {
    console.error("Checkout farmer cart error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER CATALOG FOR FARMERS ====================
export const getDealerCatalogProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;
    const { page = 1, limit = 12, search, type } = req.query;

    // Verify connection
    const connection = await prisma.dealerFarmer.findFirst({
      where: { farmerId: userId, dealerId, archivedByFarmer: false },
    });
    if (!connection) {
      return res.status(403).json({ message: "You are not connected to this dealer" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      dealerId,
      currentStock: { gt: 0 },
    };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }
    if (type && type !== "ALL") {
      where.type = type;
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { id: true, name: true, contact: true, address: true },
    });

    const [products, total] = await Promise.all([
      prisma.dealerProduct.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          unit: true,
          sellingPrice: true,
          currentStock: true,
          unitConversions: true,
          companyProduct: {
            select: {
              unitConversions: true,
            },
          },
        },
      }),
      prisma.dealerProduct.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      dealer,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get dealer catalog error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER: LIST PURCHASE REQUESTS ====================
export const getFarmerPurchaseRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, status, dealerId } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { farmerId: userId };
    if (status) where.status = status;
    if (dealerId) where.dealerId = dealerId;

    const [requests, total] = await Promise.all([
      prisma.farmerPurchaseRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          dealer: { select: { id: true, name: true, contact: true, address: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, type: true, unit: true } },
            },
          },
          dealerSale: { select: { id: true, invoiceNumber: true } },
        },
      }),
      prisma.farmerPurchaseRequest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get farmer purchase requests error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER: GET PURCHASE REQUEST BY ID ====================
export const getFarmerPurchaseRequestById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const request = await prisma.farmerPurchaseRequest.findFirst({
      where: { id, farmerId: userId },
      include: {
        dealer: { select: { id: true, name: true, contact: true, address: true } },
        items: { include: { product: true } },
        dealerSale: {
          select: { id: true, invoiceNumber: true, date: true, totalAmount: true, paidAmount: true, dueAmount: true },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    return res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    console.error("Get farmer purchase request by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER: PURCHASE REQUEST STATS ====================
export const getFarmerPurchaseRequestStats = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    const [pending, approved, rejected, totalCount] = await Promise.all([
      prisma.farmerPurchaseRequest.count({ where: { farmerId: userId, status: "PENDING" } }),
      prisma.farmerPurchaseRequest.count({ where: { farmerId: userId, status: "APPROVED" } }),
      prisma.farmerPurchaseRequest.count({ where: { farmerId: userId, status: "REJECTED" } }),
      prisma.farmerPurchaseRequest.count({ where: { farmerId: userId } }),
    ]);

    const pendingRequests = await prisma.farmerPurchaseRequest.findMany({
      where: { farmerId: userId, status: "PENDING" },
      select: { totalAmount: true },
    });
    const pendingAmount = pendingRequests.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0
    );

    return res.status(200).json({
      success: true,
      data: { pending, approved, rejected, total: totalCount, pendingAmount },
    });
  } catch (error: any) {
    console.error("Get farmer purchase request stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DEALER: LIST INCOMING PURCHASE REQUESTS ====================
export const getDealerPurchaseRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, status, farmerId } = req.query;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { dealerId: dealer.id };
    if (status) where.status = status;
    if (farmerId) where.farmerId = farmerId;

    const [requests, total] = await Promise.all([
      prisma.farmerPurchaseRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          farmer: { select: { id: true, name: true, phone: true, companyName: true } },
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, type: true, unit: true, sellingPrice: true, currentStock: true } },
            },
          },
          dealerSale: { select: { id: true, invoiceNumber: true } },
        },
      }),
      prisma.farmerPurchaseRequest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get dealer purchase requests error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DEALER: GET PURCHASE REQUEST BY ID ====================
export const getDealerPurchaseRequestById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const request = await prisma.farmerPurchaseRequest.findFirst({
      where: { id, dealerId: dealer.id },
      include: {
        farmer: { select: { id: true, name: true, phone: true, companyName: true } },
        customer: { select: { id: true, name: true, phone: true, address: true } },
        items: { include: { product: true } },
        dealerSale: {
          select: { id: true, invoiceNumber: true, date: true, totalAmount: true, paidAmount: true, dueAmount: true },
        },
        dealer: { select: { id: true, name: true, contact: true, address: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    return res.status(200).json({ success: true, data: request });
  } catch (error: any) {
    console.error("Get dealer purchase request by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DEALER: PURCHASE REQUEST STATS ====================
export const getDealerPurchaseRequestStats = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const [pending, approved, rejected, totalCount] = await Promise.all([
      prisma.farmerPurchaseRequest.count({ where: { dealerId: dealer.id, status: "PENDING" } }),
      prisma.farmerPurchaseRequest.count({ where: { dealerId: dealer.id, status: "APPROVED" } }),
      prisma.farmerPurchaseRequest.count({ where: { dealerId: dealer.id, status: "REJECTED" } }),
      prisma.farmerPurchaseRequest.count({ where: { dealerId: dealer.id } }),
    ]);

    const pendingRequests = await prisma.farmerPurchaseRequest.findMany({
      where: { dealerId: dealer.id, status: "PENDING" },
      select: { totalAmount: true },
    });
    const pendingAmount = pendingRequests.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0
    );

    return res.status(200).json({
      success: true,
      data: { pending, approved, rejected, total: totalCount, pendingAmount },
    });
  } catch (error: any) {
    console.error("Get dealer purchase request stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DEALER: APPROVE PURCHASE REQUEST ====================
export const approvePurchaseRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { discount } = req.body || {};

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const discountParam =
      discount && discount.value > 0
        ? { type: discount.type as "PERCENT" | "FLAT", value: Number(discount.value) }
        : undefined;

    const sale = await FarmerPurchaseRequestService.approvePurchaseRequest({
      requestId: id,
      dealerId: dealer.id,
      discount: discountParam,
    });

    return res.status(200).json({
      success: true,
      data: sale,
      message: "Purchase request approved. Sale created.",
    });
  } catch (error: any) {
    console.error("Approve purchase request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: REJECT PURCHASE REQUEST ====================
export const rejectPurchaseRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const request = await FarmerPurchaseRequestService.rejectPurchaseRequest({
      requestId: id,
      dealerId: dealer.id,
      rejectionReason,
    });

    return res.status(200).json({
      success: true,
      data: request,
      message: "Purchase request rejected.",
    });
  } catch (error: any) {
    console.error("Reject purchase request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};
