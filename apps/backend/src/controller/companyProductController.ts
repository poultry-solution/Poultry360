import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

// ==================== CREATE COMPANY PRODUCT ====================
export const createCompanyProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    const { name, description, type, unit, unitSellingPrice, unitCostPrice, quantity, imageUrl } = req.body;

    // Validation
    if (!name || !type || !unit || !unitSellingPrice || !quantity) {
      return res.status(400).json({
        message: "Name, type, unit, unit selling price, and quantity are required",
      });
    }

    // Get the company record
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Calculate total price (using unitSellingPrice as the basis for value for now, or maybe cost? User didn't specify, but previously it was price * quantity. "price" was selling price. So I will keep it as selling price * quantity)
    // Actually, "Total Price" usually means total inventory value which is cost. But to be safe and consistent with previous "price" usage:
    // If I change "price" to "unitSellingPrice", I should probably use that.
    const totalPrice = Number(unitSellingPrice) * Number(quantity);

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        type,
        unit,
        unitSellingPrice: new Prisma.Decimal(unitSellingPrice),
        unitCostPrice: unitCostPrice ? new Prisma.Decimal(unitCostPrice) : new Prisma.Decimal(0),
        quantity: new Prisma.Decimal(quantity),
        currentStock: new Prisma.Decimal(quantity), // Set initial stock
        totalPrice: new Prisma.Decimal(totalPrice),
        imageUrl: imageUrl || null,
        supplierId: userId as string,
      },
    });

    return res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully",
    });
  } catch (error: any) {
    console.error("Create company product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET ALL COMPANY PRODUCTS ====================
export const getCompanyProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, search, type } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      supplierId: userId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
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
    console.error("Get company products error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET COMPANY PRODUCT BY ID ====================
export const getCompanyProductById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        supplierId: userId,
      },
      include: {
        dealerProducts: {
          select: {
            id: true,
            dealer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
    console.error("Get company product by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE COMPANY PRODUCT ====================
export const updateCompanyProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const { name, description, type, unit, unitSellingPrice, unitCostPrice, quantity, imageUrl } = req.body;

    // Check if product exists and belongs to company
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        supplierId: userId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate new total price if price or quantity changed
    const newPrice = unitSellingPrice !== undefined ? Number(unitSellingPrice) : Number(existingProduct.unitSellingPrice);
    const newQuantity = quantity !== undefined ? Number(quantity) : Number(existingProduct.quantity);
    const totalPrice = newPrice * newQuantity;

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        type,
        unit,
        unitSellingPrice: unitSellingPrice !== undefined ? new Prisma.Decimal(unitSellingPrice) : undefined,
        unitCostPrice: unitCostPrice !== undefined ? new Prisma.Decimal(unitCostPrice) : undefined,
        quantity: quantity !== undefined ? new Prisma.Decimal(quantity) : undefined,
        currentStock: quantity !== undefined ? new Prisma.Decimal(quantity) : undefined, // Update stock when quantity changes
        totalPrice: new Prisma.Decimal(totalPrice),
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully",
    });
  } catch (error: any) {
    console.error("Update company product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE COMPANY PRODUCT ====================
export const deleteCompanyProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if product exists and belongs to company
    const product = await prisma.product.findFirst({
      where: {
        id,
        supplierId: userId,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product is referenced by dealer products
    const dealerProductCount = await prisma.dealerProduct.count({
      where: { companyProductId: id },
    });

    if (dealerProductCount > 0) {
      return res.status(400).json({
        message: "Cannot delete product that is used by dealers",
      });
    }

    // Check if product is in consignments
    const consignmentItemCount = await prisma.consignmentItem.count({
      where: { companyProductId: id },
    });

    if (consignmentItemCount > 0) {
      return res.status(400).json({
        message: "Cannot delete product that is in consignments",
      });
    }

    // Delete product
    await prisma.product.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete company product error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET COMPANY PRODUCT SUMMARY ====================
export const getCompanyProductSummary = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    // Get the company for this user
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    // Get total products
    const totalProducts = await prisma.product.count({
      where: { supplierId: userId },
    });

    // Get products by type
    const productsByType = await prisma.product.groupBy({
      by: ["type"],
      where: { supplierId: userId },
      _count: true,
      _sum: {
        quantity: true,
        totalPrice: true,
      },
    });

    // Get total inventory value
    const products = await prisma.product.findMany({
      where: { supplierId: userId },
    });

    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + Number(product.totalPrice);
    }, 0);

    // Get connected dealers count from DealerCompany relationship
    // Also count manually created dealers (those with userId = current user)
    let dealersCount = 0;

    if (company) {
      // Count connected dealers (active, not archived by company)
      const connectedDealers = await (prisma as any).dealerCompany.count({
        where: {
          companyId: company.id,
          archivedByCompany: false,
        },
      });

      // Count manually created dealers
      const manualDealers = await prisma.dealer.count({
        where: {
          userId: userId,
        },
      });

      dealersCount = connectedDealers + manualDealers;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalInventoryValue,
        dealersCount,
        productsByType: productsByType.map((item) => ({
          type: item.type,
          count: item._count,
          totalQuantity: item._sum.quantity,
          totalValue: item._sum.totalPrice,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get company product summary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADJUST COMPANY PRODUCT STOCK ====================
export const adjustCompanyProductStock = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    // Validation
    if (quantity === undefined) {
      return res.status(400).json({
        message: "Quantity is required",
      });
    }

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        id,
        supplierId: userId,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate new quantity and total price
    const newQuantity = Number(product.quantity) + Number(quantity);
    const newCurrentStock = Number(product.currentStock || product.quantity) + Number(quantity);
    const newTotalPrice = newQuantity * Number(product.unitSellingPrice);

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        quantity: new Prisma.Decimal(newQuantity),
        currentStock: new Prisma.Decimal(newCurrentStock),
        totalPrice: new Prisma.Decimal(newTotalPrice),
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedProduct,
      message: "Stock adjusted successfully",
    });
  } catch (error: any) {
    console.error("Adjust company product stock error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

