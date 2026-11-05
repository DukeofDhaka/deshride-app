// Strings added after the original dictionary in i18n.tsx. Kept in their own
// file so feature work doesn't keep growing one 600-line object; they are
// merged into the main dictionaries at startup.
export const extraStrings: { bn: Record<string, string>; en: Record<string, string> } = {
  bn: {
    message: 'বার্তা',
    phoneWarning: 'নিরাপত্তা সতর্কতা: ফোন নম্বর শেয়ার করবেন না। বুকিং নিশ্চিত হলে অ্যাপেই যোগাযোগ করুন।',
    errorPrefix: 'ভুল:',
    errorPastTime: 'যাত্রার সময় ভবিষ্যতে হতে হবে।',
    chatTitle: 'বার্তা',
    chattingWith: '{name}-এর সাথে কথোপকথন',
    noMessagesYet: 'কোন বার্তা নেই। কথোপকথন শুরু করতে নিচে লিখুন।',
    typeMessage: 'বার্তা লিখুন...',
    send: 'পাঠান',
    ratingLabel: 'রেটিং',
    starsLabel: '{n} তারা',
    paymentMethodLabel: 'পেমেন্টের মাধ্যম',
    ownerNidMasked: 'মালিকের এনআইডি: ···{last4}',
    ownerDrives: ' (মালিক নিজেই চালান)',
    driverNidMasked: ' · ড্রাইভারের এনআইডি: ···{last4}',
    yourCarPhotoAlt: 'আপনার গাড়ির ছবি',
    nidPlaceholder: '১০, ১৩ বা ১৭ সংখ্যা',
    perSeatShort: '/সিট',
    primaryNav: 'প্রধান মেনু'
  },
  en: {
    message: 'Message',
    phoneWarning: 'Safety warning: don’t share phone numbers. Once a booking is confirmed, talk in the app.',
    errorPrefix: 'Error:',
    errorPastTime: 'The departure time must be in the future.',
    chatTitle: 'Chat',
    chattingWith: 'Chatting with {name}',
    noMessagesYet: 'No messages yet. Type below to start the conversation.',
    typeMessage: 'Type a message...',
    send: 'Send',
    ratingLabel: 'Rating',
    starsLabel: '{n} stars',
    paymentMethodLabel: 'Payment method',
    ownerNidMasked: 'Owner NID: ···{last4}',
    ownerDrives: ' (owner drives)',
    driverNidMasked: ' · Driver NID: ···{last4}',
    yourCarPhotoAlt: 'Your car',
    nidPlaceholder: '10, 13 or 17 digits',
    perSeatShort: '/seat',
    primaryNav: 'Primary'
  }
};
