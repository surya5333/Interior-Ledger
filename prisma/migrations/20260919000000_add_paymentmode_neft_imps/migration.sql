-- Safe enum extension: add NEFT and IMPS to existing PaymentMode type
-- Does not touch existing enum values, transaction rows, or table structure
ALTER TYPE "PaymentMode" ADD VALUE 'NEFT';
ALTER TYPE "PaymentMode" ADD VALUE 'IMPS';
