export type PublicBusiness = {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  phone: string | null;
  website: string | null;
  offers: {
    id: string;
    title: string;
    description: string;
    terms: string | null;
    endsAt: string;
  }[];
};
