import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

// ==================== CREATE DEALER PRODUCT ====================
export const createDealerProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.userId; // Assuming dealer is logged in with their user ID

    const {
      name,
      description,
      type,
      unit,
      costPrice,
      sellingPrice,
      currentStock,
      minStock,
      sku,
      companyProductId,
      unitConversions,
    } = req.body;

    // Validation
    if (!name || !type || !unit || !costPrice || !sellingPrice) {
      return res.status(400).json({
        message: "Name, type, unit, cost price, and selling price are required",
      });
    }

    // Get the dealer record to get dealerId
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check if product with same name, cost price and selling price already exists
    const existingProduct = await prisma.dealerProduct.findFirst({
      where: {
        dealerId: dealer.id,
        name,
        costPrice,
        sellingPrice,
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        message:
          "Product with this name, cost price, and selling price already exists",
      });
    }

    // Create product with optional unit conversions
    const product = await prisma.dealerProduct.create({
      data: {
        name,
        description,
        type,
        unit,
        costPrice: new Prisma.Decimal(costPrice),
        sellingPrice: new Prisma.Decimal(sellingPrice),
        currentStock: currentStock ? new Prisma.Decimal(currentStock) : new Prisma.Decimal(0),
        minStock: minStock ? new Prisma.Decimal(minStock) : null,
        sku,
        dealerId: dealer.id,
        companyProductId,
        ...(unitConversions && unitConversions.length > 0 && {
          unitConversions: {
            create: unitConversions.map((uc: { unitName: string; conversionFactor: number }) => ({
              unitName: uc.unitName,
              conversionFactor: new Prisma.Decimal(uc.conversionFactor),
            })),
          },
        }),
      },
      include: { unitConversions: true },
    });

    return res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully",
    });
  } catch (error: any) {
    console.error("Create dealer product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET ALL DEALER PRODUCTS ====================
export const getDealerProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.userId;
    const { page = 1, limit = 10, search, type, lowStock, includeHidden } = req.query;
    const includeHiddenBool =
      typeof includeHidden === "string"
        ? includeHidden === "true"
        : Array.isArray(includeHidden)
          ? includeHidden.includes("true")
          : false;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      dealerId: dealer.id,
    };
    // Default behavior: hide hidden rows from the main inventory table.
    if (!includeHiddenBool) {
      where.hiddenAt = null;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { sku: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (lowStock === "true") {
      where.currentStock = {
        lte: prisma.dealerProduct.fields.minStock,
      };
    }

    const [products, total] = await Promise.all([
      prisma.dealerProduct.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          manualCompany: { select: { id: true, name: true, archivedAt: true } },
          supplierCompany: { select: { id: true, name: true } },
          companyProduct: {
            include: { unitConversions: true },
          },
          unitConversions: true,
        },
      }),
      prisma.dealerProduct.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get dealer products error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER PRODUCT BY ID ====================
export const getDealerProductById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.userId;
    const { id } = req.params;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const product = await prisma.dealerProduct.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
      include: {
        manualCompany: { select: { id: true, name: true, archivedAt: true } },
        supplierCompany: { select: { id: true, name: true } },
        companyProduct: {
          include: { unitConversions: true },
        },
        transactions: {
          orderBy: { date: "desc" },
          take: 10,
        },
        unitConversions: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error("Get dealer product by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE DEALER PRODUCT ====================
export const updateDealerProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.userId;
    const { id } = req.params;

    const {
      name,
      description,
      type,
      unit,
      costPrice,
      sellingPrice,
      minStock,
      sku,
      unitConversions,
    } = req.body;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check if product exists and belongs to dealer
    const existingProduct = await prisma.dealerProduct.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check for duplicates if name or costPrice or sellingPrice is changing
    const targetName = name || existingProduct.name;
    const targetCostPrice = costPrice
      ? new Prisma.Decimal(costPrice)
      : existingProduct.costPrice;
    const targetSellingPrice = sellingPrice
      ? new Prisma.Decimal(sellingPrice)
      : existingProduct.sellingPrice;

    if (
      (name && name !== existingProduct.name) ||
      (costPrice && Number(costPrice) !== Number(existingProduct.costPrice)) ||
      (sellingPrice &&
        Number(sellingPrice) !== Number(existingProduct.sellingPrice))
    ) {
      const duplicateProduct = await prisma.dealerProduct.findFirst({
        where: {
          dealerId: dealer.id,
          name: targetName,
          costPrice: targetCostPrice,
          sellingPrice: targetSellingPrice,
          NOT: {
            id,
          },
        },
      });

      if (duplicateProduct) {
        return res.status(400).json({
          message:
            "Product with this name, cost price, and selling price already exists. Updates would cause a duplicate.",
        });
      }
    }

    // Update product and unit conversions in a transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (unitConversions !== undefined) {
        await tx.dealerProductUnitConversion.deleteMany({ where: { dealerProductId: id } });
        if (unitConversions.length > 0) {
          await tx.dealerProductUnitConversion.createMany({
            data: unitConversions.map((uc: { unitName: string; conversionFactor: number }) => ({
              dealerProductId: id,
              unitName: uc.unitName,
              conversionFactor: new Prisma.Decimal(uc.conversionFactor),
            })),
          });
        }
      }

      return tx.dealerProduct.update({
        where: { id },
        data: {
          name,
          description,
          type,
          unit,
          costPrice: costPrice ? new Prisma.Decimal(costPrice) : undefined,
          sellingPrice: sellingPrice ? new Prisma.Decimal(sellingPrice) : undefined,
          minStock: minStock !== undefined ? (minStock ? new Prisma.Decimal(minStock) : null) : undefined,
          sku,
        },
        include: { unitConversions: true },
      });
    });

    return res.status(200).json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully",
    });
  } catch (error: any) {
    console.error("Update dealer product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE DEALER PRODUCT ====================
export const deleteDealerProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.userId;
    const { id } = req.params;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check if product exists and belongs to dealer
    const product = await prisma.dealerProduct.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Only allow delete when stock is 0 (prevents deleting active inventory items)
    const currentStock = Number(product.currentStock || 0);
    if (currentStock !== 0) {
      return res.status(400).json({
        message: "Cannot delete product unless stock is 0",
      });
    }

    // Check if product has been used in sales
    const saleItemsCount = await prisma.dealerSaleItem.count({
      where: { productId: id },
    });

    if (saleItemsCount > 0) {
      return res.status(400).json({
        message: "Cannot delete product that has been used in sales",
      });
    }

    // Delete product
    await prisma.dealerProduct.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete dealer product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== HIDE / UNHIDE DEALER PRODUCT ====================
export const hideDealerProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealerId = req.userId;
    const { id } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const product = await prisma.dealerProduct.findFirst({
      where: { id, dealerId: dealer.id },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Only allow hide when stock is already 0, so user doesn't hide active items.
    const stock = Number(product.currentStock || 0);
    if (stock !== 0) {
      return res.status(400).json({ message: "Cannot hide product unless stock is 0" });
    }

    const updated = await prisma.dealerProduct.update({
      where: { id },
      data: { hiddenAt: new Date() },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Hide dealer product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unhideDealerProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealerId = req.userId;
    const { id } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const product = await prisma.dealerProduct.findFirst({
      where: { id, dealerId: dealer.id },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const updated = await prisma.dealerProduct.update({
      where: { id },
      data: { hiddenAt: null },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Unhide dealer product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY SUMMARY ====================
export const getInventorySummary = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.userId;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get total products
    const totalProducts = await prisma.dealerProduct.count({
      where: { dealerId: dealer.id },
    });

    // Get low stock products
    const lowStockProducts = await prisma.dealerProduct.count({
      where: {
        dealerId: dealer.id,
        AND: [
          { minStock: { not: null } },
          {
            currentStock: {
              lte: prisma.dealerProduct.fields.minStock,
            },
          },
        ],
      },
    });

    // Get out of stock products
    const outOfStockProducts = await prisma.dealerProduct.count({
      where: {
        dealerId: dealer.id,
        currentStock: { lte: 0 },
      },
    });

    // Get total inventory value
    const products = await prisma.dealerProduct.findMany({
      where: { dealerId: dealer.id },
    });

    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + Number(product.currentStock) * Number(product.costPrice);
    }, 0);

    // Get products by type
    const productsByType = await prisma.dealerProduct.groupBy({
      by: ["type"],
      where: { dealerId: dealer.id },
      _count: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalInventoryValue,
        productsByType,
      },
    });
  } catch (error: any) {
    console.error("Get inventory summary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADJUST PRODUCT STOCK ====================
export const adjustProductStock = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.userId;
    const { id } = req.params;
    const { quantity, type, description, reference } = req.body;

    // Validation
    if (!quantity || !type) {
      return res.status(400).json({
        message: "Quantity and type are required",
      });
    }

    if (!["ADJUSTMENT", "PURCHASE", "RETURN"].includes(type)) {
      return res.status(400).json({
        message: "Invalid adjustment type",
      });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check if product exists
    const product = await prisma.dealerProduct.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Perform adjustment
    const result = await prisma.$transaction(async (tx) => {
      // Update stock
      const updatedProduct = await tx.dealerProduct.update({
        where: { id },
        data: {
          currentStock: {
            increment: new Prisma.Decimal(quantity),
          },
          // If stock is being increased/restocked, make the row visible again.
          hiddenAt: null,
        },
      });

      // Create transaction record
      await tx.dealerProductTransaction.create({
        data: {
          type,
          quantity: new Prisma.Decimal(Math.abs(quantity)),
          unitPrice: product.costPrice,
          totalAmount: new Prisma.Decimal(Math.abs(quantity) * Number(product.costPrice)),
          date: new Date(),
          description: description || `Stock ${type.toLowerCase()}`,
          reference,
          productId: id,
        },
      });

      return updatedProduct;
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: "Stock adjusted successfully",
    });
  } catch (error: any) {
    console.error("Adjust product stock error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

