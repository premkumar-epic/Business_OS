export const defaultCompany = {
  name: "Business OS",
  accountHolder: "Business OS",
  addressLine1: "1st Floor, Near Varun Lotus Appartments",
  addressLine2: "Singasandra",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560068",
  phone: "+91 9449645760",
  email: "ivkgarments@gmail.com",
  gstin: "29DPSPK8374F1Z2",
  contactPerson: "Vijay Kumar",
  bankName: "HDFC Bank",
  accountNo: "50200012345678",
  ifscCode: "HDFC0001234",
  branch: "Singasandra, Bengaluru",
  upiId: "9449645760@paytm"
};

export const defaultCustomers = [
  {
    id: "cust-1",
    name: "APB Designs",
    contactPerson: "Manager",
    phone: "+91 9845012345",
    email: "apbdesigns@gmail.com",
    address: "3rd Floor, 14th 'A' Cross, Adarsh Nagar, Begur Main Road, Hongasandra",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560068",
    gstin: "32KGPPS7947B1ZT",
    oldBalance: 150980
  },
  {
    id: "cust-2",
    name: "Babu (BATCHELOR)",
    contactPerson: "Babu",
    phone: "+91 9947774488",
    email: "batchelor.palakkad@gmail.com",
    address: "42/1103, New Delux Complex, GB Road, Near Punjab National Bank, Vaddakanthara",
    city: "Palakkad",
    state: "Kerala",
    pincode: "678001",
    gstin: "32KGPPS7947B1ZT",
    oldBalance: 100740
  },
  {
    id: "cust-3",
    name: "EX - Casuals",
    contactPerson: "Ex Manager",
    phone: "+91 9844001122",
    email: "excasuals@gmail.com",
    address: "Main Garment Complex, Industrial Area",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560068",
    gstin: "29EXCAS7890C1Z1",
    oldBalance: 0
  },
  {
    id: "cust-4",
    name: "Lux & Berg",
    contactPerson: "Rajesh",
    phone: "+91 9740112233",
    email: "luxberg@gmail.com",
    address: "Commercial Street Garment Zone",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    gstin: "29LUXBG5566A1Z4",
    oldBalance: 45000
  }
];

export const defaultProducts = [
  { id: "prod-1", name: "Yellow Clothing – Style 6610 (Half Sleeves)", hsn: "6205", rate: 80, category: "Shirts" },
  { id: "prod-2", name: "Yellow Clothing – Style 6611 (Full Sleeves)", hsn: "6205", rate: 80, category: "Shirts" },
  { id: "prod-3", name: "Plain Lenin Shirts", hsn: "6205", rate: 125, category: "Shirts" },
  { id: "prod-4", name: "Checks Casual Shirts", hsn: "6205", rate: 145, category: "Shirts" },
  { id: "prod-5", name: "Oxford Slub Polo Shirts", hsn: "6205", rate: 165, category: "Shirts" },
  { id: "prod-6", name: "Officer Kids Wear", hsn: "6209", rate: 95, category: "Kids" },
  { id: "prod-7", name: "JEEP Casual Shirts", hsn: "6205", rate: 150, category: "Shirts" },
  { id: "prod-8", name: "Embroidery Work Charge", hsn: "9988", rate: 6, category: "Services" }
];

export const initialInvoices = [
  {
    id: "inv-excasuals",
    documentTitle: "INVOICE",
    invoiceNo: "EX-001",
    date: "2026-07-31",
    dueDate: "2026-08-14",
    referenceDC: "",
    customer: {
      name: "EX - Casuals",
      address: "Main Garment Complex, Industrial Area, Bengaluru, Karnataka",
      gstin: "29EXCAS7890C1Z1",
      phone: "+91 9844001122"
    },
    items: [
      { id: 1, description: "EX - Casuals Main Shirts", quantity: 1279, rate: 145, amount: 185455 },
      { id: 2, description: "Embroidery Work (279 x 6)", quantity: 279, rate: 6, amount: 1674 },
      { id: 3, description: "Embroidery Special (272 x 8)", quantity: 272, rate: 8, amount: 2176 },
      { id: 4, description: "Old Checks (E)", quantity: 318, rate: 6, amount: 1908 },
      { id: 5, description: "Old Brushing (P)", quantity: 164, rate: 10, amount: 1640 }
    ],
    subtotal: 192853,
    useCustomGstAmount: true,
    customGstAmount: 5116,
    gstRate: 0,
    gstAmount: 5116,
    oldBalance: 0,
    useCustomTotalAmount: false,
    customTotalAmount: 197969,
    totalAmount: 197969,
    status: "Paid",
    paidAmount: 197969,
    notes: "Full payment received."
  },
  {
    id: "inv-batchelor",
    documentTitle: "INVOICE",
    invoiceNo: "B002",
    date: "2026-07-31",
    dueDate: "2026-08-15",
    referenceDC: "DC-BATCHELOR-01",
    customer: {
      name: "Babu (BATCHELOR)",
      address: "42/1103, New Delux Complex, GB Road, Near Punjab National Bank, Vaddakanthara, Palakad, Kerala",
      phone: "+91 9947774488",
      gstin: "32KGPPS7947B1ZT",
      state: "Kerala"
    },
    items: [
      { id: 1, description: "Batchelor Shirts (907 x 125)", quantity: 907, rate: 125, amount: 113375 },
      { id: 2, description: "Embroidery (907 x 6)", quantity: 907, rate: 6, amount: 5442 }
    ],
    subtotal: 118817,
    useCustomGstAmount: true,
    customGstAmount: 3628,
    gstRate: 0,
    gstAmount: 3628,
    oldBalance: 100740,
    useCustomTotalAmount: false,
    customTotalAmount: 223185,
    totalAmount: 223185,
    status: "Partially Paid",
    paidAmount: 100000,
    notes: "Partially paid ₹1,00,000 on 31st July."
  },
  {
    id: "inv-1",
    documentTitle: "INVOICE",
    invoiceNo: "APB01",
    date: "2026-07-16",
    dueDate: "2026-07-30",
    referenceDC: "2727, 2738",
    customer: {
      name: "APB Designs",
      address: "3rd Floor, 14th 'A' Cross, Adarsh Nagar, Begur Main Road, Hongasandra, Bangalore - 560068",
      gstin: "32KGPPS7947B1ZT",
      state: "Karnataka"
    },
    items: [
      { id: 1, description: "Yellow Clothing – Style No. : 6610", quantity: 1427, rate: 80, amount: 114160 },
      { id: 2, description: "Yellow Clothing – Style No. : 6611", quantity: 1390, rate: 80, amount: 111200 }
    ],
    subtotal: 225360,
    gstRate: 0,
    gstAmount: 0,
    oldBalance: 150980,
    totalAmount: 376340,
    status: "Pending",
    paidAmount: 0,
    notes: "Reference DC No. : 2727, 2738. Pending payment."
  }
];
