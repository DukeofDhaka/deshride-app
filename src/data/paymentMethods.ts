export type PaymentMethodId = "bkash" | "nagad" | "card";

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  hint: string;
  confirmationNote: string;
}

// Every method settles into escrow: DeshRide holds the fare when the driver
// accepts, and releases it to the driver only after the trip completes.
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "bkash",
    label: "bKash",
    hint: "Pay from your bKash wallet",
    confirmationNote:
      "When the driver accepts, you approve a bKash payment. DeshRide holds it and pays the driver after the trip completes."
  },
  {
    id: "nagad",
    label: "Nagad",
    hint: "Pay from your Nagad wallet",
    confirmationNote:
      "When the driver accepts, you approve a Nagad payment. DeshRide holds it and pays the driver after the trip completes."
  },
  {
    id: "card",
    label: "Card",
    hint: "Visa or Mastercard",
    confirmationNote:
      "When the driver accepts, your card is charged. DeshRide holds the fare and pays the driver after the trip completes."
  }
];

export function getPaymentMethod(id: string | null): PaymentMethod {
  return PAYMENT_METHODS.find((method) => method.id === id) ?? PAYMENT_METHODS[0];
}
