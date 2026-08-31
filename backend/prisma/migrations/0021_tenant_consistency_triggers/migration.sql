-- Reject cross-tenant references at the database boundary.
-- Nullable tenant IDs remain supported for legacy/global catalog rows; when both
-- sides are tenant-owned, their ownership must match.

CREATE OR REPLACE FUNCTION "enforce_tenant_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb := to_jsonb(NEW);
  child_tenant text := row_data ->> 'tenantId';
  parent_tenant text;
  parent_id text;
  parent_table text;
  relation_name text;
BEGIN
  IF child_tenant IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'Domain' THEN
    parent_table := 'Store'; parent_id := row_data ->> 'storeId'; relation_name := 'store';
  ELSIF TG_TABLE_NAME = 'StoreSettingsVersion' THEN
    parent_table := 'Store'; parent_id := row_data ->> 'storeId'; relation_name := 'store';
  ELSIF TG_TABLE_NAME = 'MerchantEnquiry' THEN
    parent_table := 'Store'; parent_id := row_data ->> 'storeId'; relation_name := 'store';
  ELSIF TG_TABLE_NAME = 'MerchantQuote' THEN
    parent_table := 'MerchantEnquiry'; parent_id := row_data ->> 'enquiryId'; relation_name := 'enquiry';
  ELSIF TG_TABLE_NAME = 'Product' THEN
    parent_table := 'Category'; parent_id := row_data ->> 'categoryId'; relation_name := 'category';
  ELSIF TG_TABLE_NAME = 'Variant' THEN
    parent_table := 'Product'; parent_id := row_data ->> 'productId'; relation_name := 'product';
  ELSIF TG_TABLE_NAME = 'CartItem' OR TG_TABLE_NAME = 'WishlistItem' OR TG_TABLE_NAME = 'RecentlyViewed' OR TG_TABLE_NAME = 'Review' THEN
    parent_table := 'Product'; parent_id := row_data ->> 'productId'; relation_name := 'product';
  ELSIF TG_TABLE_NAME = 'OrderItem' THEN
    parent_table := 'Order'; parent_id := row_data ->> 'orderId'; relation_name := 'order';
  ELSIF TG_TABLE_NAME = 'Transaction' THEN
    parent_table := 'Order'; parent_id := row_data ->> 'orderId'; relation_name := 'order';
  ELSIF TG_TABLE_NAME = 'Payment' THEN
    parent_table := 'Order'; parent_id := row_data ->> 'orderId'; relation_name := 'order';
  ELSIF TG_TABLE_NAME = 'AddonSubscription' THEN
    parent_table := 'Subscription'; parent_id := row_data ->> 'subscriptionId'; relation_name := 'subscription';
  ELSIF TG_TABLE_NAME = 'Invoice' THEN
    parent_table := 'Subscription'; parent_id := row_data ->> 'subscriptionId'; relation_name := 'subscription';
  ELSIF TG_TABLE_NAME = 'StorageAsset' THEN
    parent_table := 'Store'; parent_id := row_data ->> 'storeId'; relation_name := 'store';
  ELSIF TG_TABLE_NAME = 'BillingCredit' THEN
    RETURN NEW;
  ELSE
    RETURN NEW;
  END IF;

  IF parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT "tenantId"::text FROM %I WHERE "id" = $1', parent_table)
    INTO parent_tenant
    USING parent_id;

  IF parent_tenant IS NOT NULL AND parent_tenant <> child_tenant THEN
    RAISE EXCEPTION 'Tenant ownership mismatch for % relation on %', relation_name, TG_TABLE_NAME
      USING ERRCODE = '23514';
  END IF;

  -- Check additional tenant-bearing relations where a record can reference
  -- more than one aggregate (payments, order items, and transactions).
  IF TG_TABLE_NAME = 'OrderItem' THEN
    parent_id := row_data ->> 'productId';
    SELECT "tenantId"::text INTO parent_tenant FROM "Product" WHERE "id" = parent_id;
    IF parent_tenant IS NOT NULL AND parent_tenant <> child_tenant THEN
      RAISE EXCEPTION 'Tenant ownership mismatch for product relation on OrderItem' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'Transaction' THEN
    parent_id := row_data ->> 'paymentId';
    IF parent_id IS NOT NULL THEN
      SELECT "tenantId"::text INTO parent_tenant FROM "Payment" WHERE "id" = parent_id;
      IF parent_tenant IS NOT NULL AND parent_tenant <> child_tenant THEN
        RAISE EXCEPTION 'Tenant ownership mismatch for payment relation on Transaction' USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'Payment' THEN
    parent_id := row_data ->> 'invoiceId';
    IF parent_id IS NOT NULL THEN
      SELECT "tenantId"::text INTO parent_tenant FROM "Invoice" WHERE "id" = parent_id;
      IF parent_tenant IS NOT NULL AND parent_tenant <> child_tenant THEN
        RAISE EXCEPTION 'Tenant ownership mismatch for invoice relation on Payment' USING ERRCODE = '23514';
      END IF;
    END IF;
    parent_id := row_data ->> 'subscriptionId';
    IF parent_id IS NOT NULL THEN
      SELECT "tenantId"::text INTO parent_tenant FROM "Subscription" WHERE "id" = parent_id;
      IF parent_tenant IS NOT NULL AND parent_tenant <> child_tenant THEN
        RAISE EXCEPTION 'Tenant ownership mismatch for subscription relation on Payment' USING ERRCODE = '23514';
      END IF;
    END IF;
    parent_id := row_data ->> 'billingRecordId';
    IF parent_id IS NOT NULL THEN
      SELECT "tenantId"::text INTO parent_tenant FROM "BillingRecord" WHERE "id" = parent_id;
      IF parent_tenant IS NOT NULL AND parent_tenant <> child_tenant THEN
        RAISE EXCEPTION 'Tenant ownership mismatch for billing relation on Payment' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "enforce_invoice_credit_tenant_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_tenant text;
  credit_tenant text;
BEGIN
  SELECT "tenantId"::text INTO invoice_tenant FROM "Invoice" WHERE "id" = NEW."invoiceId";
  SELECT "tenantId"::text INTO credit_tenant FROM "BillingCredit" WHERE "id" = NEW."creditId";
  IF invoice_tenant IS NOT NULL AND credit_tenant IS NOT NULL AND invoice_tenant <> credit_tenant THEN
    RAISE EXCEPTION 'Tenant ownership mismatch between invoice and billing credit'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "InvoiceCreditApplication_tenant_consistency"
BEFORE INSERT OR UPDATE OF "invoiceId", "creditId" ON "InvoiceCreditApplication"
FOR EACH ROW EXECUTE FUNCTION "enforce_invoice_credit_tenant_consistency"();

CREATE TRIGGER "Domain_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "storeId" ON "Domain"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "StoreSettingsVersion_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "storeId" ON "StoreSettingsVersion"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "MerchantEnquiry_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "storeId" ON "MerchantEnquiry"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "MerchantQuote_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "enquiryId" ON "MerchantQuote"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "Product_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON "Product"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "Variant_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "productId" ON "Variant"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "CartItem_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "productId" ON "CartItem"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "WishlistItem_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "productId" ON "WishlistItem"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "RecentlyViewed_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "productId" ON "RecentlyViewed"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "Review_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "productId" ON "Review"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "OrderItem_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "orderId", "productId" ON "OrderItem"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "Transaction_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "orderId", "paymentId" ON "Transaction"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "Payment_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "orderId", "invoiceId", "subscriptionId", "billingRecordId" ON "Payment"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "AddonSubscription_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "subscriptionId" ON "AddonSubscription"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "Invoice_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "subscriptionId" ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();

CREATE TRIGGER "StorageAsset_tenant_consistency"
BEFORE INSERT OR UPDATE OF "tenantId", "storeId" ON "StorageAsset"
FOR EACH ROW EXECUTE FUNCTION "enforce_tenant_consistency"();
