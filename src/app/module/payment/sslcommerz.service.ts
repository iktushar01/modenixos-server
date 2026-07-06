import SSLCommerzPayment from "sslcommerz-lts";
import { sslcommerzConfig } from "../../../config/sslcommerz.config";

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
  num_of_item: number;
  product_name: string;
  product_category: string;
  product_profile: string;
  value_a?: string;
  value_b?: string;
};

const getClient = () => {
  if (!sslcommerzConfig.isConfigured) {
    throw new Error("SSLCommerz is not configured. Set SSLC_STORE_ID and SSLC_STORE_PASSWORD.");
  }
  return new SSLCommerzPayment(
    sslcommerzConfig.storeId,
    sslcommerzConfig.storePassword,
    sslcommerzConfig.isLive,
  );
};

export const SslCommerzService = {
  async initPayment(data: SslInitPayload) {
    const sslcz = getClient();
    const response = await sslcz.init(data);
    return response as {
      status?: string;
      failedreason?: string;
      GatewayPageURL?: string;
      sessionkey?: string;
    };
  },

  async validatePayment(valId: string) {
    const sslcz = getClient();
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
