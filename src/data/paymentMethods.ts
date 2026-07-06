export type PaymentMethodId = "bkash" | "nagad" | "card";

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  labelKey?: string;
  hint: string;
  hintKey: string;
  confirmationNote: string;
  confirmationNoteKey: string;
}

// Every method settles into escrow: DeshRide holds the fare when the driver
// accepts, and releases it to the driver only after the trip completes.
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "bkash",
    label: "bKash",
    hint: "বিকাশ থেকে পেমেন্ট",
    hintKey: "paymentBkashHint",
    confirmationNote:
      "ড্রাইভার গ্রহণ করলে বিকাশ পেমেন্ট অনুমোদন করবেন। টাকা দেশরাইডের কাছে জমা থাকবে — ট্রিপ শেষে ড্রাইভার পাবেন।",
    confirmationNoteKey: "paymentBkashConfirmation"
  },
  {
    id: "nagad",
    label: "Nagad",
    hint: "নগদ থেকে পেমেন্ট",
    hintKey: "paymentNagadHint",
    confirmationNote:
      "ড্রাইভার গ্রহণ করলে নগদ পেমেন্ট অনুমোদন করবেন। টাকা দেশরাইডের কাছে জমা থাকবে — ট্রিপ শেষে ড্রাইভার পাবেন।",
    confirmationNoteKey: "paymentNagadConfirmation"
  },
  {
    id: "card",
    label: "কার্ড",
    labelKey: "paymentCardLabel",
    hint: "ভিসা বা মাস্টারকার্ড",
    hintKey: "paymentCardHint",
    confirmationNote:
      "ড্রাইভার গ্রহণ করলে কার্ডে চার্জ হবে। ভাড়া দেশরাইডের কাছে জমা থাকবে — ট্রিপ শেষে ড্রাইভার পাবেন।",
    confirmationNoteKey: "paymentCardConfirmation"
  }
];

export function getPaymentMethod(id: string | null): PaymentMethod {
  return PAYMENT_METHODS.find((method) => method.id === id) ?? PAYMENT_METHODS[0];
}
