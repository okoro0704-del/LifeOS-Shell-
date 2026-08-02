export type Room = {
  id: string;
  name: string;
  beds: string;
  price: number;
  description: string;
};

export const HOTEL_NAME = "Sunrise Hotel";

export const ROOMS: Room[] = [
  {
    id: "deluxe",
    name: "Deluxe King",
    beds: "1 King",
    price: 180,
    description: "Waterfront views, rainfall shower, workspace.",
  },
  {
    id: "twin",
    name: "Twin Garden",
    beds: "2 Twin",
    price: 140,
    description: "Quiet courtyard rooms with morning light.",
  },
  {
    id: "suite",
    name: "Harbor Suite",
    beds: "1 King + sofa",
    price: 280,
    description: "Separate lounge, soaking tub, welcome amenity.",
  },
];
