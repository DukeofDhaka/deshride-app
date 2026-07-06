import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'bn' | 'en';

interface TranslationContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  bn: {
    findRide: 'রাইড খুঁজুন',
    postRide: 'রাইড দিন',
    myRides: 'আমার রাইড',
    profile: 'প্রোফাইল',
    heroLabel: 'ইন্টারসিটি কারপুলিং · সমগ্র বাংলাদেশ',
    heroTitle: 'আর নয় খালি সিট।',
    heroLead1: 'ড্রাইভার যাচ্ছেনই — খালি সিটগুলো পাচ্ছেন আপনি। বাসের ভাড়ায়, দরজা থেকে দরজায়।',
    heroLead2: 'Share the ride, share the cost.',
    fromWhere: 'কোথা থেকে',
    toWhere: 'কোথায় যাবেন',
    dateOfJourney: 'যাত্রার তারিখ',
    seats: 'সিট',
    previousSearches: 'আগের খোঁজ',
    anywhere: 'যেকোনো জায়গা',
    postRidePrompt: 'গাড়িতে খালি সিট আছে?',
    postRideLink: 'রাইড পোস্ট করুন →',
    mapCaption: 'আসন্ন রাইডগুলোর পিকআপ ও ড্রপ-অফ পয়েন্ট।',
    mapClose: 'ম্যাপ বন্ধ',
    mapOpen: 'ম্যাপে বাছুন',
    mapHint: 'ম্যাপে যেকোনো জায়গায় ট্যাপ করে পিন বসান।',
    districtOrArea: 'জেলা বা এলাকা',
    meetWhere: 'ঠিক কোথায় দেখা হবে? যেমন: কলাবাগান বাসস্ট্যান্ড, গেট ২',
    areaLabel: 'এলাকা',
    divisionLabel: 'বিভাগ',
    chooseInside: '-এর ভেতরে বেছে নিন:',
    near: '-এর কাছে',
    ridesCount: 'টি রাইড',
    nothingOnThatDay: 'কিছু নেই — একই রুটে অন্য দিনের রাইডগুলো দেখুন।',
    noRidesOnRoute: 'এই রুটে এখনো কোনো রাইড নেই।',
    beTheFirst: 'এই রুটে প্রথম হোন।',
    postSeatsPrompt: 'এই রুটে গাড়ি চালান? খালি সিটগুলো পোস্ট করুন — যাত্রীরা আপনাকে খুঁজে নেবে।'
  },
  en: {
    findRide: 'Find Ride',
    postRide: 'Post Ride',
    myRides: 'My Rides',
    profile: 'Profile',
    heroLabel: 'Intercity Carpooling · All over Bangladesh',
    heroTitle: 'No more empty seats.',
    heroLead1: 'The driver is going anyway — you get the empty seats. Bus fares, door to door.',
    heroLead2: 'Share the ride, share the cost.',
    fromWhere: 'Leaving from',
    toWhere: 'Going to',
    dateOfJourney: 'Date of journey',
    seats: 'Seats',
    previousSearches: 'Recent searches',
    anywhere: 'Anywhere',
    postRidePrompt: 'Have empty seats?',
    postRideLink: 'Post a ride →',
    mapCaption: 'Pickup and drop-off points for upcoming rides.',
    mapClose: 'Close map',
    mapOpen: 'Pick on map',
    mapHint: 'Tap anywhere on the map to place a pin.',
    districtOrArea: 'District or Area',
    meetWhere: 'Exact meeting point? e.g. Kalabagan Bus Stand, Gate 2',
    areaLabel: 'Area',
    divisionLabel: 'Division',
    chooseInside: 'Choose inside',
    near: 'near',
    ridesCount: 'rides',
    nothingOnThatDay: 'Nothing found — check other days on this route.',
    noRidesOnRoute: 'No rides on this route yet.',
    beTheFirst: 'Be the first on this route.',
    postSeatsPrompt: 'Driving this route? Post your empty seats — passengers will find you.'
  }
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('bn');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'bn' ? 'en' : 'bn');
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
