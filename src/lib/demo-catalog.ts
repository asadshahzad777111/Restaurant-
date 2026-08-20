import type { MenuItem, StockItem } from "./tenant-types";

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
const p = (n: number) =>
  `https://images.pexels.com/photos/${n}/pexels-photo-${n}.jpeg?auto=compress&cs=tinysrgb&w=800`;

const burgerMods: MenuItem["modifiers"] = [
  {
    id: "mg_size",
    name: "Size",
    required: true,
    multi: false,
    options: [
      { id: "reg", name: "Regular", priceDelta: 0 },
      { id: "large", name: "Large", priceDelta: 120 },
    ],
  },
  {
    id: "mg_spice",
    name: "Spice",
    required: false,
    multi: false,
    options: [
      { id: "mild", name: "Mild", priceDelta: 0 },
      { id: "spicy", name: "Spicy", priceDelta: 0 },
    ],
  },
  {
    id: "mg_add",
    name: "Add-ons",
    required: false,
    multi: true,
    options: [
      { id: "cheese", name: "Extra cheese", priceDelta: 80 },
      { id: "egg", name: "Fried egg", priceDelta: 60 },
    ],
  },
];

const spiceMod: MenuItem["modifiers"] = [
  {
    id: "mg_heat",
    name: "Heat",
    required: false,
    multi: false,
    options: [
      { id: "mild", name: "Mild", priceDelta: 0 },
      { id: "medium", name: "Medium", priceDelta: 0 },
      { id: "wild", name: "Wild", priceDelta: 0 },
    ],
  },
];

function dish(
  id: string,
  name: string,
  description: string,
  price: number,
  category: string,
  imageUrl: string,
  extra?: Partial<MenuItem>,
): MenuItem {
  return {
    id,
    name,
    description,
    price,
    category,
    available: true,
    imageUrl,
    ...extra,
  };
}

/** Full Demo Kitchen board — Pakistani + international, photos on every item. */
export function demoMenu(): MenuItem[] {
  return [
    dish(
      "m8",
      "Family Feast",
      "2 burgers · 12\" pizza · 4 drinks",
      3490,
      "Deals",
      u("photo-1414235077428-338989a2e8c0"),
      { isDeal: true, dealLabel: "Save 18%", compareAtPrice: 4250, imageEmoji: "🔥" },
    ),
    dish(
      "m41",
      "Weekend Grill Platter",
      "Tikka · seekh · malai boti · 4 naan",
      4290,
      "Deals",
      u("photo-1559339352-11d035aa65de"),
      { isDeal: true, dealLabel: "Share for 4", compareAtPrice: 5100, imageEmoji: "🔥" },
    ),
    dish(
      "m42",
      "Lunch Combo",
      "Biryani · drink · raita",
      890,
      "Deals",
      u("photo-1594212699903-ec8a3eca50f5"),
      { isDeal: true, dealLabel: "Weekday", compareAtPrice: 1090, imageEmoji: "🔥" },
    ),

    dish(
      "m1",
      "Classic Beef Burger",
      "Angus beef · cheddar · house sauce",
      650,
      "Burgers",
      u("photo-1568901346375-23c9450c58cd"),
      { modifiers: burgerMods, imageEmoji: "🍽️" },
    ),
    dish(
      "m2",
      "Chicken Zinger",
      "Crispy fillet · spicy mayo",
      580,
      "Burgers",
      u("photo-1606755962773-d324e0a13086"),
    ),
    dish(
      "m3",
      "Cheese Smash",
      "Double smash · American cheese",
      720,
      "Burgers",
      u("photo-1550547660-d9450f859349"),
    ),
    dish("m9", "BBQ Beef Burger", "Smoked BBQ · onion jam · cheddar", 690, "Burgers", u("photo-1553979459-d2229ba7433b")),
    dish(
      "m10",
      "Mushroom Swiss Burger",
      "Sautéed mushrooms · Swiss · garlic aioli",
      740,
      "Burgers",
      u("photo-1571091718767-18b5b1457add"),
    ),

    dish("m4", "Pepperoni Pizza", "12\" · mozzarella · oregano", 1290, "Pizza", u("photo-1628840042765-356cda07504e")),
    dish("m5", "Margherita", "Fresh basil · tomato · mozzarella", 990, "Pizza", u("photo-1574071318508-1cdbab80d002")),
    dish("m11", "Fajita Pizza", "Capsicum · onion · chicken fajita", 1390, "Pizza", u("photo-1565299624946-b28f40a0ae38")),
    dish(
      "m12",
      "Chicken Tikka Pizza",
      "Tandoori tikka · mint chutney drizzle",
      1450,
      "Pizza",
      u("photo-1604382354936-07c5d9983bd3"),
    ),

    dish(
      "m13",
      "Chicken Karahi",
      "Wok-tossed tomato · ginger · green chilli",
      1450,
      "Karahi",
      p(2474661),
      { modifiers: spiceMod },
    ),
    dish("m14", "Mutton Karahi", "On-the-bone · desi ghee · crushed chilli", 2190, "Karahi", p(958545), {
      modifiers: spiceMod,
    }),
    dish("m15", "White Karahi", "Cream · black pepper · chicken", 1650, "Karahi", p(2474658)),
    dish("m16", "Handi Chicken", "Slow handi · yogurt gravy · kasuri methi", 1550, "Karahi", u("photo-1631452180519-c014fe946bcc")),

    dish("m17", "Chicken Tikka", "Charcoal tikka · chat masala · lemon", 890, "Grill", u("photo-1599487488170-d11ec9c172f0")),
    dish("m18", "Seekh Kebab", "Minced beef · four pieces · mint raita", 780, "Grill", u("photo-1555939594-58d7cb561ad1")),
    dish("m19", "Malai Boti", "Cream-marinated chicken · butter finish", 920, "Grill", u("photo-1598515214211-89d3c73ae83b")),
    dish("m20", "Fish Tikka", "Boneless river fish · ajwain · lemon butter", 1190, "Grill", u("photo-1519708227418-c8fd9a32b7a2")),

    dish("m21", "Chicken Shawarma Roll", "Garlic sauce · fries inside · pickled chilli", 420, "Rolls", u("photo-1529006557810-274b9b2fc783")),
    dish("m22", "Beef Chapli Roll", "Chapli patty · onion · imli", 480, "Rolls", u("photo-1626700051175-6818013e1d4f")),
    dish("m23", "Zinger Roll", "Crispy fillet · mayo · iceberg", 450, "Rolls", u("photo-1565299585323-38d6b0865b47")),

    dish("m24", "Chicken Biryani", "Sindhi-style · potato · raita", 590, "Biryani", u("photo-1563379091339-03b21ab4a4f8")),
    dish("m25", "Mutton Biryani", "On-bone mutton · saffron steam", 790, "Biryani", p(1624487)),
    dish("m26", "Vegetable Biryani", "Mixed veg · mint · fried onion", 490, "Biryani", u("photo-1589302168068-964664d93dc0")),

    dish("m27", "Fettuccine Alfredo", "Cream · parmesan · garlic", 890, "Pasta", u("photo-1621996346565-e3dbc646d9a7")),
    dish("m28", "Chicken Penne", "Arrabbiata · grilled chicken", 950, "Pasta", u("photo-1551183053-bf91a1d81141")),
    dish("m29", "Spaghetti", "Tomato basil · olive oil", 780, "Pasta", u("photo-1612874742237-65262258ea32")),

    dish("m30", "Masala Fries", "Chat masala · garlic mayo", 280, "Sides", u("photo-1573080496219-bb080dd4f877")),
    dish("m31", "Garlic Naan", "Tandoor · butter garlic", 120, "Sides", u("photo-1565557623262-b51c2513a641")),
    dish("m32", "Onion Rings", "Crispy batter · ranch", 320, "Sides", u("photo-1639024471283-03518883512d")),
    dish("m33", "House Salad", "Greens · cucumber · lemon dressing", 350, "Sides", u("photo-1512621776951-a57141f2eefd")),

    dish("m7", "Chocolate Brownie", "Warm · vanilla scoop", 350, "Desserts", u("photo-1606313564200-e75d5e30476c")),
    dish("m34", "Gulab Jamun", "Two pieces · warm syrup", 280, "Desserts", u("photo-1488477181946-6428a0291777")),
    dish("m35", "Pistachio Kulfi", "Hand-churned · falooda optional", 320, "Desserts", u("photo-1563805042-7684c019e1cb")),
    dish("m36", "New York Cheesecake", "Baked slice · berry", 420, "Desserts", u("photo-1533134486753-c833f0ed6094")),

    dish("m6", "Fresh Lime", "Sweet or salty · soda", 180, "Drinks", u("photo-1513558161293-cdaf765ed2fd")),
    dish("m37", "Mango Lassi", "Alphonso pulp · yogurt", 280, "Drinks", u("photo-1527661591475-527312dd65f5")),
    dish("m38", "Soft Drink", "330ml can · chilled", 120, "Drinks", u("photo-1622483767028-3f66f32aef97")),
    dish("m39", "Karak Chai", "Doodh patti · extra elaichi", 150, "Drinks", u("photo-1576092768241-dec231879fc3")),
    dish("m40", "Fresh Orange Juice", "Pressed to order", 320, "Drinks", u("photo-1600271886742-f049cd451bba")),
  ];
}

export function demoStock(): StockItem[] {
  return [
    { id: "s1", name: "Beef patties", unit: "pcs", quantity: 48, lowThreshold: 12 },
    { id: "s2", name: "Burger buns", unit: "pcs", quantity: 60, lowThreshold: 15 },
    { id: "s3", name: "Mozzarella", unit: "kg", quantity: 8, lowThreshold: 2 },
    { id: "s4", name: "Soft drink cans", unit: "pcs", quantity: 24, lowThreshold: 12 },
    { id: "s5", name: "Chicken", unit: "kg", quantity: 18, lowThreshold: 4 },
    { id: "s6", name: "Basmati rice", unit: "kg", quantity: 22, lowThreshold: 5 },
    { id: "s7", name: "Naan dough", unit: "pcs", quantity: 80, lowThreshold: 20 },
    { id: "s8", name: "Mutton", unit: "kg", quantity: 9, lowThreshold: 2 },
  ];
}
