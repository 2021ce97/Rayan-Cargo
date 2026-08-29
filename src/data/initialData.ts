import { Branch, User, Shipment } from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'br_kbl_01',
    name: 'Kabul Central Hub',
    nameFa: 'نمایندگی مرکزی کابل',
    namePs: 'د کابل مرکزي څانګه',
    code: 'KBL-01',
    province: 'Kabul',
    city: 'Kabul City (Shahr-e-Naw)',
    address: 'Ansari Square, Shahr-e-Naw, Cargo Center #4',
    phone: '+93 79 123 4567',
    email: 'kabul@rayancargo.af',
    managerName: 'Ahmad Rashid Safi',
    isHeadOffice: true,
    activeShipmentsCount: 142,
    totalParcelsDispatched: 1890,
    totalParcelsReceived: 1420,
    totalRevenueAfn: 984500,
    createdAt: '2025-01-10T08:00:00Z'
  },
  {
    id: 'br_hrt_02',
    name: 'Herat Western Terminal',
    nameFa: 'نمایندگی ولایت هرات',
    namePs: 'د هرات ولایت څانګه',
    code: 'HRT-02',
    province: 'Herat',
    city: 'Herat City',
    address: 'Velayat Road, Near Minarets Cargo Terminal',
    phone: '+93 70 882 1144',
    email: 'herat@rayancargo.af',
    managerName: 'Mohammad Farhad Nazari',
    isHeadOffice: false,
    activeShipmentsCount: 88,
    totalParcelsDispatched: 920,
    totalParcelsReceived: 850,
    totalRevenueAfn: 485000,
    createdAt: '2025-01-15T09:30:00Z'
  },
  {
    id: 'br_mzr_03',
    name: 'Mazar-i-Sharif Northern Hub',
    nameFa: 'نمایندگی مزارشریف و بلخ',
    namePs: 'د مزارشریف څانګه (بلخ)',
    code: 'MZR-03',
    province: 'Balkh',
    city: 'Mazar-i-Sharif',
    address: 'Kefayat Market Road, Near Rawza Square',
    phone: '+93 78 554 9900',
    email: 'mazar@rayancargo.af',
    managerName: 'Zabihullah Balkhi',
    isHeadOffice: false,
    activeShipmentsCount: 64,
    totalParcelsDispatched: 780,
    totalParcelsReceived: 710,
    totalRevenueAfn: 395000,
    createdAt: '2025-02-01T10:00:00Z'
  },
  {
    id: 'br_kdh_04',
    name: 'Kandahar Southern Terminal',
    nameFa: 'نمایندگی ولایت قندهار',
    namePs: 'د کندهار ولایت څانګه',
    code: 'KDH-04',
    province: 'Kandahar',
    city: 'Kandahar City',
    address: 'Shahidano Chawk, Commercial Cargo Terminal',
    phone: '+93 77 441 2233',
    email: 'kandahar@rayancargo.af',
    managerName: 'Noor Ahmad Popalzai',
    isHeadOffice: false,
    activeShipmentsCount: 52,
    totalParcelsDispatched: 640,
    totalParcelsReceived: 620,
    totalRevenueAfn: 340000,
    createdAt: '2025-02-10T11:15:00Z'
  },
  {
    id: 'br_jlb_05',
    name: 'Jalalabad Eastern Hub',
    nameFa: 'نمایندگی جلال‌آباد ننگرهار',
    namePs: 'د جلال اباد څانګه (ننګرهار)',
    code: 'JLB-05',
    province: 'Nangarhar',
    city: 'Jalalabad City',
    address: 'Mukhabirat Chowk, Torkham Transit Way',
    phone: '+93 74 332 7788',
    email: 'jalalabad@rayancargo.af',
    managerName: 'Hikmatullah Shinwari',
    isHeadOffice: false,
    activeShipmentsCount: 45,
    totalParcelsDispatched: 580,
    totalParcelsReceived: 510,
    totalRevenueAfn: 290000,
    createdAt: '2025-02-20T08:45:00Z'
  },
  {
    id: 'br_knd_06',
    name: 'Kunduz North Gateway',
    nameFa: 'نمایندگی ولایت کندز',
    namePs: 'د کندز ولایت څانګه',
    code: 'KND-06',
    province: 'Kunduz',
    city: 'Kunduz City',
    address: 'Main Bandar Khanabad, Cargo Hub 2',
    phone: '+93 72 990 1234',
    email: 'kunduz@rayancargo.af',
    managerName: 'Sardar Wali Qadiri',
    isHeadOffice: false,
    activeShipmentsCount: 28,
    totalParcelsDispatched: 310,
    totalParcelsReceived: 290,
    totalRevenueAfn: 175000,
    createdAt: '2025-03-01T12:00:00Z'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'Eng. Sayed Mustafa Hashemi',
    email: 'admin@rayancargo.af',
    phone: '+93 79 900 1122',
    role: 'super_admin',
    branchId: 'all',
    password: 'admin123',
    passwordChangedByBranch: false,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2025-01-01T00:00:00Z',
    lastLogin: 'Just now'
  },
  {
    id: 'usr_kbl_01',
    name: 'Ahmad Rashid Safi',
    email: 'kabul@rayancargo.af',
    phone: '+93 79 123 4567',
    role: 'branch_manager',
    branchId: 'br_kbl_01',
    password: 'kabul123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2025-01-10T08:00:00Z',
    lastLogin: '10 mins ago'
  },
  {
    id: 'usr_hrt_02',
    name: 'Mohammad Farhad Nazari',
    email: 'herat@rayancargo.af',
    phone: '+93 70 882 1144',
    role: 'branch_manager',
    branchId: 'br_hrt_02',
    password: 'herat123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2025-01-15T09:30:00Z',
    lastLogin: '1 hour ago'
  },
  {
    id: 'usr_mzr_03',
    name: 'Zabihullah Balkhi',
    email: 'mazar@rayancargo.af',
    phone: '+93 78 554 9900',
    role: 'branch_manager',
    branchId: 'br_mzr_03',
    password: 'mazar123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2025-02-01T10:00:00Z',
    lastLogin: '25 mins ago'
  },
  {
    id: 'usr_kdh_04',
    name: 'Noor Ahmad Popalzai',
    email: 'kandahar@rayancargo.af',
    phone: '+93 77 441 2233',
    role: 'branch_manager',
    branchId: 'br_kdh_04',
    password: 'kandahar123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2025-02-10T11:15:00Z',
    lastLogin: '40 mins ago'
  },
  {
    id: 'usr_jlb_05',
    name: 'Hikmatullah Shinwari',
    email: 'jalalabad@rayancargo.af',
    phone: '+93 74 332 7788',
    role: 'branch_manager',
    branchId: 'br_jlb_05',
    password: 'jalalabad123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2025-02-20T08:45:00Z',
    lastLogin: '5 mins ago'
  },
  {
    id: 'usr_knd_06',
    name: 'Sardar Wali Qadiri',
    email: 'kunduz@rayancargo.af',
    phone: '+93 72 990 1234',
    role: 'branch_manager',
    branchId: 'br_knd_06',
    password: 'kunduz123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2025-03-01T12:00:00Z',
    lastLogin: '2 hours ago'
  }
];

export const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: 'shp_894201',
    cnNumber: 'RYN-894201',
    originBranchId: 'br_kbl_01',
    destinationBranchId: 'br_hrt_02',
    currentBranchId: 'br_hrt_02',
    sender: {
      name: 'Haji Abdul Qayoom Trading Co.',
      phone: '+93 79 555 1234',
      email: 'qayoom.textiles@gmail.com',
      nationalId: 'TK-98234120',
      address: 'Shop 42, Mandawi Wholesale Market',
      city: 'Kabul',
      province: 'Kabul'
    },
    receiver: {
      name: 'Farid Silk & Clothing House',
      phone: '+93 70 223 8899',
      altPhone: '+93 78 119 4433',
      address: 'Chawk Golha, Silk Market Plaza #12',
      city: 'Herat City',
      province: 'Herat'
    },
    packageInfo: {
      category: 'garments',
      weightKg: 28.5,
      pieces: 4,
      dimensions: '60x45x35 cm',
      declaredValueAfn: 120000,
      description: '4 Large cartons of high-grade silk garments & raw fabric',
      serviceType: 'express',
      isFragile: false
    },
    financials: {
      baseRate: 350,
      weightCost: 1425,
      serviceFee: 150,
      discountType: 'percentage',
      discountValue: 10,
      discountAmount: 192.5,
      tax: 0,
      totalAmount: 1732.5,
      amountPaid: 1732.5,
      amountDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      discountReason: 'Regular Merchant Discount 10%'
    },
    status: 'received_at_branch',
    statusHistory: [
      {
        id: 'st_1',
        status: 'booked',
        location: 'Kabul Central Hub',
        branchName: 'Kabul Central Hub',
        timestamp: '2026-08-25T09:15:00Z',
        note: 'Consignment booked by Kabul Branch Officer.',
        updatedBy: 'Ahmad Rashid Safi'
      },
      {
        id: 'st_2',
        status: 'in_transit',
        location: 'Kabul-Kandahar-Herat Highway Transit',
        branchName: 'Logistics Fleet Vehicle #849',
        timestamp: '2026-08-25T14:30:00Z',
        note: 'Dispatched by Kabul Branch in express container truck #AF-9921',
        updatedBy: 'Ahmad Rashid Safi',
        driverName: 'Ramin Noori',
        driverPhone: '+93 79 881 2233'
      },
      {
        id: 'st_3',
        status: 'received_at_branch',
        location: 'Herat Western Terminal Hub',
        branchName: 'Herat Western Terminal',
        timestamp: '2026-08-26T18:45:00Z',
        note: 'Safely arrived at Herat warehouse. Received and acknowledged by Herat Manager.',
        updatedBy: 'Mohammad Farhad Nazari'
      }
    ],
    bookedAt: '2026-08-25T09:15:00Z',
    estimatedDelivery: '2026-08-27T12:00:00Z',
    bookedByUserId: 'usr_kbl_01',
    bookedByUserName: 'Ahmad Rashid Safi'
  },
  {
    id: 'shp_894202',
    cnNumber: 'RYN-894202',
    originBranchId: 'br_mzr_03',
    destinationBranchId: 'br_kbl_01',
    currentBranchId: 'br_kbl_01',
    sender: {
      name: 'Balkh Electronic Supplies',
      phone: '+93 78 889 9001',
      nationalId: 'TK-11029384',
      address: 'Shahre Naw Electronic Plaza, Mazar',
      city: 'Mazar-i-Sharif',
      province: 'Balkh'
    },
    receiver: {
      name: 'Techno Kabul Solutions Ltd.',
      phone: '+93 79 334 5566',
      address: 'Torabaz Khan St., Shar-e-Naw, Shop #18',
      city: 'Kabul',
      province: 'Kabul'
    },
    packageInfo: {
      category: 'electronics',
      weightKg: 12.0,
      pieces: 2,
      dimensions: '40x30x25 cm',
      declaredValueAfn: 350000,
      description: 'Laptops, networking routers, and high-frequency transceivers',
      serviceType: 'express',
      isFragile: true
    },
    financials: {
      baseRate: 400,
      weightCost: 720,
      serviceFee: 250,
      discountType: 'fixed',
      discountValue: 100,
      discountAmount: 100,
      tax: 0,
      totalAmount: 1270,
      amountPaid: 1270,
      amountDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      discountReason: 'VIP Corporate Partner'
    },
    status: 'out_for_delivery',
    statusHistory: [
      {
        id: 'st_4',
        status: 'booked',
        location: 'Mazar-i-Sharif Northern Hub',
        branchName: 'Mazar-i-Sharif Northern Hub',
        timestamp: '2026-08-26T08:30:00Z',
        note: 'Package registered with Fragile Seal by Mazar Hub.',
        updatedBy: 'Zabihullah Balkhi'
      },
      {
        id: 'st_5',
        status: 'in_transit',
        location: 'Salang Pass Transit Route',
        branchName: 'Cargo Convoy #03',
        timestamp: '2026-08-26T13:00:00Z',
        note: 'Dispatched from Mazar towards Kabul via Salang Highway.',
        updatedBy: 'Zabihullah Balkhi'
      },
      {
        id: 'st_6',
        status: 'received_at_branch',
        location: 'Kabul Central Hub',
        branchName: 'Kabul Central Hub',
        timestamp: '2026-08-27T04:20:00Z',
        note: 'Safely received at Kabul Central Hub and sorted for delivery.',
        updatedBy: 'Ahmad Rashid Safi'
      },
      {
        id: 'st_7',
        status: 'out_for_delivery',
        location: 'Shar-e-Naw Kabul Zone',
        branchName: 'Kabul Central Hub',
        timestamp: '2026-08-27T08:00:00Z',
        note: 'Kabul Branch courier is en route to receiver address.',
        updatedBy: 'Ahmad Rashid Safi',
        driverName: 'Jawid Samim',
        driverPhone: '+93 77 112 3344'
      }
    ],
    bookedAt: '2026-08-26T08:30:00Z',
    estimatedDelivery: '2026-08-27T14:00:00Z',
    bookedByUserId: 'usr_mzr_03',
    bookedByUserName: 'Zabihullah Balkhi'
  },
  {
    id: 'shp_894203',
    cnNumber: 'RYN-894203',
    originBranchId: 'br_kbl_01',
    destinationBranchId: 'br_kdh_04',
    currentBranchId: 'br_kdh_04',
    sender: {
      name: 'Kabul Medical & Pharma Distribution',
      phone: '+93 79 111 4455',
      nationalId: 'TK-55099823',
      address: 'Dehbouri Medical Market, Block C',
      city: 'Kabul',
      province: 'Kabul'
    },
    receiver: {
      name: 'Mirwais Hospital Pharmacy Supply',
      phone: '+93 77 999 1100',
      address: 'Near Mirwais Regional Hospital, Aino Mina',
      city: 'Kandahar',
      province: 'Kandahar'
    },
    packageInfo: {
      category: 'general',
      weightKg: 45.0,
      pieces: 6,
      dimensions: '50x50x40 cm',
      declaredValueAfn: 280000,
      description: 'Sterile surgical kits, diagnostic strips, and medical monitors',
      serviceType: 'same_day_air',
      isFragile: true
    },
    financials: {
      baseRate: 800,
      weightCost: 3150,
      serviceFee: 300,
      discountType: 'percentage',
      discountValue: 15,
      discountAmount: 637.5,
      tax: 0,
      totalAmount: 3612.5,
      amountPaid: 3612.5,
      amountDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      discountReason: 'Ministry & Hospital Emergency Cargo rate'
    },
    status: 'delivered',
    statusHistory: [
      {
        id: 'st_8',
        status: 'booked',
        location: 'Kabul Central Hub',
        branchName: 'Kabul Central Hub',
        timestamp: '2026-08-26T07:00:00Z',
        note: 'Air cargo booked at Kabul Hub.',
        updatedBy: 'Ahmad Rashid Safi'
      },
      {
        id: 'st_9',
        status: 'in_transit',
        location: 'Kabul Airport to Kandahar Terminal',
        branchName: 'Ariana Cargo Flight FG-201',
        timestamp: '2026-08-26T10:30:00Z',
        note: 'Dispatched by Kabul Hub via Express Cargo Flight.',
        updatedBy: 'Ahmad Rashid Safi'
      },
      {
        id: 'st_10',
        status: 'received_at_branch',
        location: 'Kandahar Southern Terminal',
        branchName: 'Kandahar Southern Terminal',
        timestamp: '2026-08-26T12:45:00Z',
        note: 'Received at Kandahar terminal by Kandahar Manager.',
        updatedBy: 'Noor Ahmad Popalzai'
      },
      {
        id: 'st_11',
        status: 'delivered',
        location: 'Mirwais Hospital Pharmacy Supply, Aino Mina',
        branchName: 'Kandahar Southern Terminal',
        timestamp: '2026-08-26T15:30:00Z',
        note: 'Successfully handed over to Dr. Abdullah. Verified and confirmed by Kandahar Branch.',
        updatedBy: 'Noor Ahmad Popalzai'
      }
    ],
    bookedAt: '2026-08-26T07:00:00Z',
    estimatedDelivery: '2026-08-26T16:00:00Z',
    actualDelivery: '2026-08-26T15:30:00Z',
    podSignature: 'Dr. Abdullah Popal',
    receiverIdProof: 'NID-772819',
    bookedByUserId: 'usr_kbl_01',
    bookedByUserName: 'Ahmad Rashid Safi'
  },
  {
    id: 'shp_894204',
    cnNumber: 'RYN-894204',
    originBranchId: 'br_jlb_05',
    destinationBranchId: 'br_kbl_01',
    currentBranchId: 'br_jlb_05',
    sender: {
      name: 'Nangarhar Citrus & Dry Fruit Exporters',
      phone: '+93 74 990 0011',
      nationalId: 'TK-44392019',
      address: 'Behsud Bridge Agro Market, Shop 7',
      city: 'Jalalabad',
      province: 'Nangarhar'
    },
    receiver: {
      name: 'Pamir Gourmet & Nuts Market',
      phone: '+93 78 777 6622',
      address: 'Kote Sangi, Main Commercial Avenue #8',
      city: 'Kabul',
      province: 'Kabul'
    },
    packageInfo: {
      category: 'foodstuff',
      weightKg: 85.0,
      pieces: 10,
      dimensions: '40x40x40 cm x 10',
      declaredValueAfn: 195000,
      description: '10 Sealed Wooden Crates of premium Jalalabad oranges & dried mulberries',
      serviceType: 'standard',
      isFragile: false
    },
    financials: {
      baseRate: 500,
      weightCost: 2550,
      serviceFee: 100,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      tax: 0,
      totalAmount: 3150,
      amountPaid: 0,
      amountDue: 3150,
      paymentStatus: 'to_pay',
      paymentMethod: 'cod',
      discountReason: ''
    },
    status: 'in_transit',
    statusHistory: [
      {
        id: 'st_12',
        status: 'booked',
        location: 'Jalalabad Eastern Hub',
        branchName: 'Jalalabad Eastern Hub',
        timestamp: '2026-08-27T06:15:00Z',
        note: 'Booked with Cash-on-Delivery (To-Pay) mode by Jalalabad Branch.',
        updatedBy: 'Hikmatullah Shinwari'
      },
      {
        id: 'st_13',
        status: 'in_transit',
        location: 'Mahipar Highway Pass en route to Kabul',
        branchName: 'East Fleet Truck #29',
        timestamp: '2026-08-27T07:45:00Z',
        note: 'Dispatched by Jalalabad Branch towards Kabul sorting terminal.',
        updatedBy: 'Hikmatullah Shinwari',
        driverName: 'Wali Khan',
        driverPhone: '+93 74 123 9988'
      }
    ],
    bookedAt: '2026-08-27T06:15:00Z',
    estimatedDelivery: '2026-08-27T17:00:00Z',
    bookedByUserId: 'usr_jlb_05',
    bookedByUserName: 'Hikmatullah Shinwari'
  },
  {
    id: 'shp_894205',
    cnNumber: 'RYN-894205',
    originBranchId: 'br_hrt_02',
    destinationBranchId: 'br_mzr_03',
    currentBranchId: 'br_hrt_02',
    sender: {
      name: 'Herat Saffron Guild Export Group',
      phone: '+93 70 551 2233',
      nationalId: 'TK-77890123',
      address: 'Darwaza Qandahar, Saffron Complex #3',
      city: 'Herat',
      province: 'Herat'
    },
    receiver: {
      name: 'Aryana Northern Spices Trading',
      phone: '+93 78 332 1199',
      address: 'Mazar Grand Bazaar, Alley 4',
      city: 'Mazar-i-Sharif',
      province: 'Balkh'
    },
    packageInfo: {
      category: 'fragile',
      weightKg: 4.5,
      pieces: 1,
      dimensions: '30x20x15 cm',
      declaredValueAfn: 450000,
      description: 'Super Negin Grade A Pure Saffron vacuum-sealed gift tins',
      serviceType: 'express',
      isFragile: true
    },
    financials: {
      baseRate: 400,
      weightCost: 350,
      serviceFee: 300,
      discountType: 'fixed',
      discountValue: 50,
      discountAmount: 50,
      tax: 0,
      totalAmount: 1000,
      amountPaid: 1000,
      amountDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      discountReason: 'Valued Customer Promo'
    },
    status: 'booked',
    statusHistory: [
      {
        id: 'st_14',
        status: 'booked',
        location: 'Herat Western Terminal',
        branchName: 'Herat Western Terminal',
        timestamp: '2026-08-27T07:30:00Z',
        note: 'Sealed with tamper-evident high security tags by Herat Branch.',
        updatedBy: 'Mohammad Farhad Nazari'
      }
    ],
    bookedAt: '2026-08-27T07:30:00Z',
    estimatedDelivery: '2026-08-29T14:00:00Z',
    bookedByUserId: 'usr_hrt_02',
    bookedByUserName: 'Mohammad Farhad Nazari'
  },
  {
    id: 'shp_894206',
    cnNumber: 'RYN-894206',
    originBranchId: 'br_kbl_01',
    destinationBranchId: 'br_knd_06',
    currentBranchId: 'br_kbl_01',
    sender: {
      name: 'Afghan Legal & Notary Documentation Center',
      phone: '+93 79 778 9900',
      address: 'Supreme Court Rd, Shar-e-Naw',
      city: 'Kabul',
      province: 'Kabul'
    },
    receiver: {
      name: 'Kunduz Land Authority & Municipal Office',
      phone: '+93 72 334 5566',
      address: 'Main Governor Street, Government Complex',
      city: 'Kunduz',
      province: 'Kunduz'
    },
    packageInfo: {
      category: 'document',
      weightKg: 0.8,
      pieces: 1,
      dimensions: '35x25x2 cm',
      declaredValueAfn: 15000,
      description: 'Official verified deed documents & court case legal files',
      serviceType: 'express',
      isFragile: false
    },
    financials: {
      baseRate: 250,
      weightCost: 50,
      serviceFee: 50,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      tax: 0,
      totalAmount: 350,
      amountPaid: 350,
      amountDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash'
    },
    status: 'in_transit',
    statusHistory: [
      {
        id: 'st_15',
        status: 'booked',
        location: 'Kabul Central Hub',
        branchName: 'Kabul Central Hub',
        timestamp: '2026-08-27T05:00:00Z',
        note: 'Express Document sealed envelope registered by Kabul Hub.',
        updatedBy: 'Ahmad Rashid Safi'
      },
      {
        id: 'st_16',
        status: 'in_transit',
        location: 'Pol-e Khomri Transit Station',
        branchName: 'Northern Route Express Courier',
        timestamp: '2026-08-27T08:15:00Z',
        note: 'Dispatched from Kabul towards Kunduz North Gateway.',
        updatedBy: 'Ahmad Rashid Safi'
      }
    ],
    bookedAt: '2026-08-27T05:00:00Z',
    estimatedDelivery: '2026-08-27T16:00:00Z',
    bookedByUserId: 'usr_kbl_01',
    bookedByUserName: 'Ahmad Rashid Safi'
  },
  {
    id: 'shp_894207',
    cnNumber: 'RYN-894207',
    originBranchId: 'br_knd_06',
    destinationBranchId: 'br_hrt_02',
    currentBranchId: 'br_knd_06',
    sender: {
      name: 'Kunduz Rice & Agricultural Grain Traders',
      phone: '+93 72 665 4433',
      address: 'Bandar-e-Kabul Agro Complex',
      city: 'Kunduz',
      province: 'Kunduz'
    },
    receiver: {
      name: 'Herat Royal Foodstuff Importers',
      phone: '+93 70 443 1122',
      address: 'Darwaza Malik, Commercial Market #6',
      city: 'Herat City',
      province: 'Herat'
    },
    packageInfo: {
      category: 'foodstuff',
      weightKg: 50.0,
      pieces: 2,
      dimensions: '80x50x30 cm',
      declaredValueAfn: 48000,
      description: '2 Sacks of Kunduz Long-Grain Super Kernal Rice (A-Grade)',
      serviceType: 'standard',
      isFragile: false
    },
    financials: {
      baseRate: 400,
      weightCost: 1500,
      serviceFee: 100,
      discountType: 'percentage',
      discountValue: 5,
      discountAmount: 100,
      tax: 0,
      totalAmount: 1900,
      amountPaid: 1900,
      amountDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash'
    },
    status: 'booked',
    statusHistory: [
      {
        id: 'st_17',
        status: 'booked',
        location: 'Kunduz North Gateway',
        branchName: 'Kunduz North Gateway',
        timestamp: '2026-08-27T08:00:00Z',
        note: 'Consignment booked by Kunduz Branch. Awaiting dispatch to Herat.',
        updatedBy: 'Sardar Wali Qadiri'
      }
    ],
    bookedAt: '2026-08-27T08:00:00Z',
    estimatedDelivery: '2026-08-30T16:00:00Z',
    bookedByUserId: 'usr_knd_06',
    bookedByUserName: 'Sardar Wali Qadiri'
  }
];
