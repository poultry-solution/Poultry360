import { Request, Response } from "express";
import prisma from "../utils/prisma";

const getDealerForRequest = async (req: Request) => {
  if (!req.userId) return null;

  return prisma.dealer.findUnique({
    where: { ownerId: req.userId },
    select: { id: true, paymentDirectionEnabled: true },
  });
};

export const getDealerPaymentDirectionSetting = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const dealer = await getDealerForRequest(req);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer account not found" });
    }

    return res.json({
      success: true,
      data: {
        paymentDirectionEnabled: dealer.paymentDirectionEnabled === true,
      },
    });
  } catch (error) {
    console.error("Get dealer payment direction setting error:", error);
    return res.status(500).json({ message: "Failed to load Dealer settings" });
  }
};

export const updateDealerPaymentDirectionSetting = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    if (typeof req.body?.paymentDirectionEnabled !== "boolean") {
      return res.status(400).json({
        message: "paymentDirectionEnabled must be true or false",
      });
    }

    const dealer = await getDealerForRequest(req);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer account not found" });
    }

    const updatedDealer = await prisma.dealer.update({
      where: { id: dealer.id },
      data: { paymentDirectionEnabled: req.body.paymentDirectionEnabled },
      select: { paymentDirectionEnabled: true },
    });

    return res.json({
      success: true,
      data: {
        paymentDirectionEnabled: updatedDealer.paymentDirectionEnabled === true,
      },
    });
  } catch (error) {
    console.error("Update dealer payment direction setting error:", error);
    return res.status(500).json({ message: "Failed to update Dealer settings" });
  }
};
