-- Merchant phone-number shopper payments use manual Send Money transfers.
-- They do not use the Daraja STK credential path.
ALTER TYPE "MerchantSettlementAccountType" ADD VALUE IF NOT EXISTS 'PHONE';
