import SSLCommerzPayment from "sslcommerz-lts";
import { sslcommerzConfig } from "../../../config/sslcommerz.config";

export type SslCredentials = {
  storeId: string;
  storePassword: string;
};

export type SslInitPayload = {
  total_amount: number;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  cus_add1: string;
  cus_city: string;
  cus_postcode: string;
  cus_country: string;
  shipping_method: "YES" | "NO";
  ship_name?: string;
  ship_add1?: string;
  ship_add2?: string;
  ship_city?: string;
  ship_state?: string;
  ship_postcode?: string;
  ship_country?: string;
  num_of_item: number;
  product_name: string;
  product_category: string;
  product_profile: string;
  value_a?: string;
  value_b?: string;
};

const getClient = (credentials?: SslCredentials) => {
  const storeId = credentials?.storeId ?? sslcommerzConfig.storeId;
  const storePassword = credentials?.storePassword ?? sslcommerzConfig.storePassword;

  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz is not configured. Set SSLC_STORE_ID and SSLC_STORE_PASSWORD.");
  }

  return new SSLCommerzPayment(storeId, storePassword, sslcommerzConfig.isLive);
};

export const SslCommerzService = {
  async initPayment(data: SslInitPayload, credentials?: SslCredentials) {
    const sslcz = getClient(credentials);
    const response = await sslcz.init(data);
    return response as {
      status?: string;
      failedreason?: string;
      GatewayPageURL?: string;
      sessionkey?: string;
    };
  },

  async validatePayment(valId: string, credentials?: SslCredentials) {
    const sslcz = getClient(credentials);
    const response = await sslcz.validate({ val_id: valId });
    return response as {
      status?: string;
      tran_id?: string;
      val_id?: string;
      amount?: string;
      store_amount?: string;
      currency?: string;
      card_type?: string;
      bank_tran_id?: string;
    };
  },
};
