export type PaymentMethodId = "bkash" | "nagad" | "cash";

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  hint: string;
  confirmationNote: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "bkash",
    label: "bKash",
    hint: "Pay from your bKash wallet",
    confirmationNote:
      "A bKash payment request will arrive when the driver confirms. Approve it in the bKash app to lock your seat."
  },
  {
    id: "nagad",
    label: "Nagad",
    hint: "Pay from your Nagad wallet",
    confirmationNote:
      "A Nagad payment request will arrive when the driver confirms. Approve it in the Nagad app to lock your seat."
  },
  {
    id: "cash",
    label: "Cash",
    hint: "Pay the driver at pickup",
    confirmationNote:
      "Bring the exact fare in cash to the pickup point. The driver marks the payment received in app before departure."
  }
];

export function getPaymentMethod(id: string | null): PaymentMethod {
  return PAYMENT_METHODS.find((method) => method.id === id) ?? PAYMENT_METHODS[0];
}
