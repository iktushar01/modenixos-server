import { randomInt, randomUUID } from "node:crypto";
import ms, { StringValue } from "ms";
import { StatusCodes } from "http-status-codes";
import { envVars } from "../../config/env";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "./password";
import { sendEmail } from "./email";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = ms(envVars.EXPIRE_OTP_TIME as StringValue);

export type StorefrontOtpPurpose = "login" | "register";

interface OtpPayload {
  hash: string;
  purpose: StorefrontOtpPurpose;
  name?: string;
}

const otpIdentifier = (storeId: string, email: string) =>
  `sf-customer-otp:${storeId}:${email.toLowerCase()}`;

const generateOtp = () =>
  String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

export const sendStorefrontCustomerOtp = async (
  storeId: string,
  storeName: string,
  email: string,
  purpose: StorefrontOtpPurpose,
  name?: string,
) => {
  const normalizedEmail = email.toLowerCase().trim();
  const customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email: normalizedEmail } },
  });

  if (purpose === "login") {
    if (!customer) {
      throw new AppError(StatusCodes.NOT_FOUND, "No account found with this email");
    }
  } else if (customer?.passwordHash) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "An account with this email already exists. Please log in.",
    );
  } else if (!name?.trim()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Name is required");
  }

  const otp = generateOtp();
  const payload: OtpPayload = {
    hash: hashPassword(otp),
    purpose,
    ...(purpose === "register" ? { name: name!.trim() } : {}),
  };

  const identifier = otpIdentifier(storeId, normalizedEmail);
  await prisma.verification.deleteMany({ where: { identifier } });
  await prisma.verification.create({
    data: {
      id: randomUUID(),
      identifier,
      value: JSON.stringify(payload),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  });

  const displayName =
    purpose === "register" ? name!.trim() : (customer?.name ?? normalizedEmail);

  await sendEmail({
    to: normalizedEmail,
    subject:
      purpose === "login"
        ? `Your ${storeName} sign-in code`
        : `Verify your ${storeName} account`,
    templateName: "otp",
    templateData: { name: displayName, otp },
  });
};

export const verifyStorefrontCustomerOtp = async (
  storeId: string,
  email: string,
  otp: string,
): Promise<{ purpose: StorefrontOtpPurpose; name?: string }> => {
  const normalizedEmail = email.toLowerCase().trim();
  const identifier = otpIdentifier(storeId, normalizedEmail);
  const record = await prisma.verification.findFirst({
    where: { identifier },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired code");
  }

  let payload: OtpPayload;
  try {
    payload = JSON.parse(record.value) as OtpPayload;
  } catch {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired code");
  }

  if (!verifyPassword(otp, payload.hash)) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired code");
  }

  await prisma.verification.delete({ where: { id: record.id } });
  const result: { purpose: StorefrontOtpPurpose; name?: string } = {
    purpose: payload.purpose,
  };
  if (payload.name) {
    result.name = payload.name;
  }
  return result;
};
