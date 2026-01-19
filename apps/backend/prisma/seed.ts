import {
  PrismaClient,
  UserRole,
  UserStatus,
  Language,
  CalendarType,
  BatchStatus,
  VaccinationStatus,
  ReminderStatus,
  ReminderType,
  RecurrencePattern,
  MessageType,
  NotificationType,
  SalesItemType,
  WeightSource,
  TransactionType,
  InventoryItemType,
  CategoryType,
  ConsignmentStatus,
  ConsignmentDirection,
  ConversationStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash password for all users (for demo purposes, using same password)
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create SUPER_ADMIN
  console.log('Creating SUPER_ADMIN...');
  const superAdmin = await prisma.user.create({
    data: {
      phone: '+9779800000001',
      name: 'System Administrator',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
  });

  // 2. Create COMPANY user with Company
  console.log('Creating COMPANY user...');
  const companyUser = await prisma.user.create({
    data: {
      phone: '+9779800000002',
      name: 'Ramesh Poultry Supplies',
      companyName: 'Ramesh Poultry Supplies Pvt. Ltd.',
      CompanyFarmLocation: 'Bagmati Province, Kathmandu',
      password: hashedPassword,
      role: UserRole.COMPANY,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
      company: {
        create: {
          name: 'Ramesh Poultry Supplies Pvt. Ltd.',
          address: 'Teku, Kathmandu',
        },
      },
    },
    include: { company: true },
  });

  // Create Company Products
  console.log('Creating company products...');
  const companyProducts = await prisma.product.createMany({
    data: [
      {
        name: 'Premium Feed Mix A',
        description: 'High protein starter feed',
        type: InventoryItemType.FEED,
        unit: 'kg',
        price: 85.00,
        quantity: 5000,
        currentStock: 5000,
        totalPrice: 425000,
        supplierId: companyUser.id,
      },
      {
        name: 'Premium Feed Mix B',
        description: 'Grower feed formula',
        type: InventoryItemType.FEED,
        unit: 'kg',
        price: 75.00,
        quantity: 3000,
        currentStock: 3000,
        totalPrice: 225000,
        supplierId: companyUser.id,
      },
      {
        name: 'Layer Chicks',
        description: 'Day-old layer chicks',
        type: InventoryItemType.CHICKS,
        unit: 'pcs',
        price: 45.00,
        quantity: 1000,
        currentStock: 1000,
        totalPrice: 45000,
        supplierId: companyUser.id,
      },
      {
        name: 'Broiler Chicks',
        description: 'Day-old broiler chicks',
        type: InventoryItemType.CHICKS,
        unit: 'pcs',
        price: 50.00,
        quantity: 2000,
        currentStock: 2000,
        totalPrice: 100000,
        supplierId: companyUser.id,
      },
      {
        name: 'Multivitamin Supplement',
        description: 'Essential vitamins for poultry',
        type: InventoryItemType.MEDICINE,
        unit: 'bottle',
        price: 350.00,
        quantity: 100,
        currentStock: 100,
        totalPrice: 35000,
        supplierId: companyUser.id,
      },
    ],
  });

  // 3. Create DEALER users (2 dealers - one linked to company, one independent)
  console.log('Creating DEALER users...');
  
  // Dealer 1: Linked to company
  const dealerUser1 = await prisma.user.create({
    data: {
      phone: '+9779800000003',
      name: 'Sita Devi',
      companyName: 'Sita Feed Center',
      CompanyFarmLocation: 'Bagmati Province, Bhaktapur',
      password: hashedPassword,
      role: UserRole.DEALER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
      dealer: {
        create: {
          name: 'Sita Feed Center',
          contact: '+9779800000003',
          address: 'Suryabinayak, Bhaktapur',
          // Don't set companyId - use DealerCompany relationship instead
        },
      },
    },
    include: { dealer: true },
  });

  // Link dealer 1 to company via DealerCompany relationship
  if (dealerUser1.dealer && companyUser.company) {
    await prisma.dealerCompany.create({
      data: {
        dealerId: dealerUser1.dealer.id,
        companyId: companyUser.company.id,
        connectedVia: 'MANUAL',
        connectedAt: new Date(),
      },
    });
    console.log('Linked Dealer 1 to Company via DealerCompany');
  }

  // Dealer 2: Independent dealer
  const dealerUser2 = await prisma.user.create({
    data: {
      phone: '+9779800000004',
      name: 'Krishna Bahadur',
      companyName: 'Krishna Agro Supplies',
      CompanyFarmLocation: 'Gandaki Province, Pokhara',
      password: hashedPassword,
      role: UserRole.DEALER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
      dealer: {
        create: {
          name: 'Krishna Agro Supplies',
          contact: '+9779800000004',
          address: 'Lakeside, Pokhara',
        },
      },
    },
    include: { dealer: true },
  });

  // Create Dealer Products for Dealer 1
  console.log('Creating dealer products...');
  const dealerProducts = await prisma.dealerProduct.createMany({
    data: [
      {
        name: 'Premium Feed Mix A',
        description: 'Reselling from company',
        type: InventoryItemType.FEED,
        unit: 'kg',
        costPrice: 85.00,
        sellingPrice: 95.00,
        currentStock: 500,
        dealerId: dealerUser1.dealer!.id,
      },
      {
        name: 'Local Feed Mix',
        description: 'Locally sourced feed',
        type: InventoryItemType.FEED,
        unit: 'kg',
        costPrice: 60.00,
        sellingPrice: 70.00,
        currentStock: 300,
        dealerId: dealerUser1.dealer!.id,
      },
      {
        name: 'Antibiotic Powder',
        description: 'For respiratory issues',
        type: InventoryItemType.MEDICINE,
        unit: 'packet',
        costPrice: 200.00,
        sellingPrice: 250.00,
        currentStock: 50,
        dealerId: dealerUser1.dealer!.id,
      },
    ],
  });

  // 4. Create DOCTOR user
  console.log('Creating DOCTOR user...');
  const doctorUser = await prisma.user.create({
    data: {
      phone: '+9779800000005',
      name: 'Dr. Binod Sharma',
      companyName: 'Poultry Health Clinic',
      CompanyFarmLocation: 'Bagmati Province, Lalitpur',
      password: hashedPassword,
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
    },
  });

  // 5. Create OWNER users (farmers - 3 different scenarios)
  console.log('Creating OWNER users (farmers)...');
  
  // Farmer 1: Active farm with ongoing batch
  const farmer1 = await prisma.user.create({
    data: {
      phone: '+9779800000006',
      name: 'Ram Prasad Ghimire',
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
      ownedFarms: {
        create: {
          name: 'Ghimire Poultry Farm',
          capacity: 5000,
          description: 'Layer farm in Chitwan',
        },
      },
    },
  });

  // Create categories for farmer 1
  const farmer1ExpenseCategories = await prisma.category.createMany({
    data: [
      { name: 'Feed', type: CategoryType.EXPENSE, userId: farmer1.id, description: 'Bird feed expenses' },
      { name: 'Medicine', type: CategoryType.EXPENSE, userId: farmer1.id, description: 'Veterinary medicines' },
      { name: 'Labor', type: CategoryType.EXPENSE, userId: farmer1.id, description: 'Worker salaries' },
      { name: 'Utilities', type: CategoryType.EXPENSE, userId: farmer1.id, description: 'Electricity and water' },
    ],
  });

  const farmer1SalesCategories = await prisma.category.createMany({
    data: [
      { name: 'Eggs', type: CategoryType.SALES, userId: farmer1.id, description: 'Egg sales' },
      { name: 'Culled Birds', type: CategoryType.SALES, userId: farmer1.id, description: 'Sale of culled chickens' },
    ],
  });

  const farmer1InventoryCategories = await prisma.category.createMany({
    data: [
      { name: 'Feed Stock', type: CategoryType.INVENTORY, userId: farmer1.id, description: 'Feed inventory' },
      { name: 'Medicine Stock', type: CategoryType.INVENTORY, userId: farmer1.id, description: 'Medicine inventory' },
    ],
  });

  // Get the created categories
  const feedExpenseCat = await prisma.category.findFirst({
    where: { userId: farmer1.id, type: CategoryType.EXPENSE, name: 'Feed' },
  });

  const medicineExpenseCat = await prisma.category.findFirst({
    where: { userId: farmer1.id, type: CategoryType.EXPENSE, name: 'Medicine' },
  });

  const eggsSalesCat = await prisma.category.findFirst({
    where: { userId: farmer1.id, type: CategoryType.SALES, name: 'Eggs' },
  });

  const feedInventoryCat = await prisma.category.findFirst({
    where: { userId: farmer1.id, type: CategoryType.INVENTORY, name: 'Feed Stock' },
  });

  // Create active batch for farmer 1
  const farm1 = await prisma.farm.findFirst({ where: { ownerId: farmer1.id } });
  
  if (farm1) {
    const batch1 = await prisma.batch.create({
      data: {
        batchNumber: 'BATCH-2024-001',
        startDate: new Date('2024-11-01'),
        status: BatchStatus.ACTIVE,
        initialChicks: 3000,
        currentWeight: 1.2,
        farmId: farm1.id,
        notes: 'Layer batch - Rhode Island Red',
      },
    });

    // Add mortalities
    await prisma.mortality.createMany({
      data: [
        { date: new Date('2024-11-05'), count: 15, reason: 'Natural mortality', batchId: batch1.id },
        { date: new Date('2024-11-12'), count: 8, reason: 'Disease', batchId: batch1.id },
        { date: new Date('2024-11-20'), count: 5, reason: 'Natural mortality', batchId: batch1.id },
      ],
    });

    // Add bird weights
    await prisma.birdWeight.createMany({
      data: [
        { date: new Date('2024-11-07'), avgWeight: 0.4, sampleCount: 50, batchId: batch1.id, source: WeightSource.MANUAL },
        { date: new Date('2024-11-14'), avgWeight: 0.7, sampleCount: 50, batchId: batch1.id, source: WeightSource.MANUAL },
        { date: new Date('2024-11-21'), avgWeight: 1.0, sampleCount: 50, batchId: batch1.id, source: WeightSource.MANUAL },
        { date: new Date('2024-12-01'), avgWeight: 1.2, sampleCount: 50, batchId: batch1.id, source: WeightSource.MANUAL },
      ],
    });

    // Add vaccinations
    await prisma.vaccination.createMany({
      data: [
        {
          vaccineName: 'Marek\'s Disease',
          scheduledDate: new Date('2024-11-02'),
          completedDate: new Date('2024-11-02'),
          status: VaccinationStatus.COMPLETED,
          userId: farmer1.id,
          batchId: batch1.id,
        },
        {
          vaccineName: 'Newcastle Disease',
          scheduledDate: new Date('2024-11-10'),
          completedDate: new Date('2024-11-10'),
          status: VaccinationStatus.COMPLETED,
          userId: farmer1.id,
          batchId: batch1.id,
        },
        {
          vaccineName: 'Infectious Bronchitis',
          scheduledDate: new Date('2024-12-25'),
          status: VaccinationStatus.PENDING,
          userId: farmer1.id,
          batchId: batch1.id,
        },
      ],
    });

    // Add expenses
    if (feedExpenseCat && medicineExpenseCat) {
      await prisma.expense.createMany({
        data: [
          {
            date: new Date('2024-11-01'),
            amount: 75000,
            description: 'Initial feed purchase',
            quantity: 1000,
            unitPrice: 75,
            farmId: farm1.id,
            batchId: batch1.id,
            categoryId: feedExpenseCat.id,
          },
          {
            date: new Date('2024-11-15'),
            amount: 5000,
            description: 'Vaccination and medicines',
            farmId: farm1.id,
            batchId: batch1.id,
            categoryId: medicineExpenseCat.id,
          },
          {
            date: new Date('2024-12-01'),
            amount: 50000,
            description: 'Feed purchase',
            quantity: 700,
            unitPrice: 71.43,
            farmId: farm1.id,
            batchId: batch1.id,
            categoryId: feedExpenseCat.id,
          },
        ],
      });
    }

    // Add sales
    if (eggsSalesCat) {
      await prisma.sale.createMany({
        data: [
          {
            date: new Date('2024-12-05'),
            amount: 15000,
            quantity: 1000,
            unitPrice: 15,
            description: 'Egg sales to local market',
            itemType: SalesItemType.EGGS,
            farmId: farm1.id,
            batchId: batch1.id,
            categoryId: eggsSalesCat.id,
          },
          {
            date: new Date('2024-12-12'),
            amount: 18000,
            quantity: 1200,
            unitPrice: 15,
            description: 'Egg sales to retailer',
            itemType: SalesItemType.EGGS,
            farmId: farm1.id,
            batchId: batch1.id,
            categoryId: eggsSalesCat.id,
          },
        ],
      });
    }
  }

  // Farmer 2: Multiple farms with completed and active batches
  const farmer2 = await prisma.user.create({
    data: {
      phone: '+9779800000007',
      name: 'Sushila Karki',
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
      ownedFarms: {
        create: [
          {
            name: 'Karki Broiler Farm 1',
            capacity: 2000,
            description: 'Broiler farm in Chitwan',
          },
          {
            name: 'Karki Broiler Farm 2',
            capacity: 3000,
            description: 'Broiler farm in Nawalpur',
          },
        ],
      },
    },
  });

  // Create categories for farmer 2
  await prisma.category.createMany({
    data: [
      { name: 'Feed', type: CategoryType.EXPENSE, userId: farmer2.id },
      { name: 'Chicks', type: CategoryType.EXPENSE, userId: farmer2.id },
      { name: 'Chicken Meat', type: CategoryType.SALES, userId: farmer2.id },
    ],
  });

  const farm2_1 = await prisma.farm.findFirst({ 
    where: { ownerId: farmer2.id, name: 'Karki Broiler Farm 1' } 
  });

  if (farm2_1) {
    // Completed batch
    const completedBatch = await prisma.batch.create({
      data: {
        batchNumber: 'BATCH-2024-BR-001',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-10-15'),
        status: BatchStatus.COMPLETED,
        initialChicks: 1500,
        currentWeight: 2.5,
        farmId: farm2_1.id,
        notes: 'Broiler batch - Cobb 500',
      },
    });

    // Active batch
    const activeBatch = await prisma.batch.create({
      data: {
        batchNumber: 'BATCH-2024-BR-002',
        startDate: new Date('2024-11-15'),
        status: BatchStatus.ACTIVE,
        initialChicks: 1800,
        currentWeight: 1.5,
        farmId: farm2_1.id,
        notes: 'Broiler batch - Ross 308',
      },
    });
  }

  // Farmer 3: New farmer with minimal data
  const farmer3 = await prisma.user.create({
    data: {
      phone: '+9779800000008',
      name: 'Bikram Thapa',
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      language: Language.ENGLISH,
      calendarType: CalendarType.AD,
      ownedFarms: {
        create: {
          name: 'Thapa Small Farm',
          capacity: 500,
          description: 'Small backyard poultry farm',
        },
      },
    },
  });

  // 6. Create MANAGER user
  console.log('Creating MANAGER user...');
  const managerUser = await prisma.user.create({
    data: {
      phone: '+9779800000009',
      name: 'Prakash Shrestha',
      password: hashedPassword,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      language: Language.NEPALI,
      calendarType: CalendarType.BS,
    },
  });

  // Assign manager to farmer 1's farm
  if (farm1) {
    await prisma.farm.update({
      where: { id: farm1.id },
      data: {
        managers: {
          connect: { id: managerUser.id },
        },
      },
    });
  }

  // 7. Create suppliers for farmers
  console.log('Creating suppliers...');
  
  // Dealers for farmer 1
  await prisma.dealer.createMany({
    data: [
      {
        name: 'Local Feed Supplier',
        contact: '+9779841234567',
        address: 'Chitwan',
        userId: farmer1.id,
      },
    ],
  });

  // Hatcheries
  await prisma.hatchery.createMany({
    data: [
      {
        name: 'Nepal Hatchery Center',
        contact: '+9779851234567',
        address: 'Kathmandu',
        userId: farmer1.id,
      },
    ],
  });

  // Medicine suppliers
  await prisma.medicineSupplier.createMany({
    data: [
      {
        name: 'Veterinary Supplies Nepal',
        contact: '+9779861234567',
        address: 'Pokhara',
        userId: farmer1.id,
      },
    ],
  });

  // 8. Create customers
  console.log('Creating customers...');
  await prisma.customer.createMany({
    data: [
      {
        name: 'Ramesh Hotel & Restaurant',
        phone: '+9779871234567',
        category: 'Restaurant',
        address: 'Thamel, Kathmandu',
        balance: 0,
        userId: farmer1.id,
      },
      {
        name: 'City Supermarket',
        phone: '+9779881234567',
        category: 'Retailer',
        address: 'New Road, Kathmandu',
        balance: 5000,
        userId: farmer1.id,
      },
      {
        name: 'Maya Grocery Store',
        phone: '+9779891234567',
        category: 'Retailer',
        address: 'Bhaktapur',
        balance: 0,
        userId: farmer2.id,
      },
    ],
  });

  // 9. Create a conversation between farmer and doctor
  console.log('Creating conversations...');
  const conversation = await prisma.conversation.create({
    data: {
      farmerId: farmer1.id,
      doctorId: doctorUser.id,
      status: ConversationStatus.ACTIVE,
      subject: 'Consultation about Newcastle Disease',
    },
  });

  // Add some messages
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: farmer1.id,
        text: 'Hello Doctor, I have some concerns about my birds showing respiratory symptoms.',
        messageType: MessageType.TEXT,
        read: true,
      },
      {
        conversationId: conversation.id,
        senderId: doctorUser.id,
        text: 'Hello Ram. Can you describe the symptoms in detail?',
        messageType: MessageType.TEXT,
        read: true,
      },
      {
        conversationId: conversation.id,
        senderId: farmer1.id,
        text: 'They are sneezing and some have watery eyes. Started 2 days ago.',
        messageType: MessageType.TEXT,
        read: false,
      },
    ],
  });

  // 10. Create reminders
  console.log('Creating reminders...');
  await prisma.reminder.createMany({
    data: [
      {
        title: 'Vaccination Due',
        description: 'Infectious Bronchitis vaccination for batch',
        type: ReminderType.VACCINATION,
        status: ReminderStatus.PENDING,
        dueDate: new Date('2024-12-25'),
        userId: farmer1.id,
        farmId: farm1?.id,
      },
      {
        title: 'Feed Supplier Payment',
        description: 'Pay pending amount to Local Feed Supplier',
        type: ReminderType.SUPPLIER_PAYMENT,
        status: ReminderStatus.PENDING,
        dueDate: new Date('2024-12-30'),
        userId: farmer1.id,
      },
      {
        title: 'Weekly Cleaning',
        description: 'Deep clean poultry house',
        type: ReminderType.CLEANING,
        status: ReminderStatus.PENDING,
        dueDate: new Date('2024-12-22'),
        isRecurring: true,
        recurrencePattern: RecurrencePattern.WEEKLY,
        recurrenceInterval: 1,
        userId: farmer1.id,
        farmId: farm1?.id,
      },
    ],
  });

  // 11. Create notifications
  console.log('Creating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.VACCINATION_REMINDER,
        title: 'Vaccination Reminder',
        body: 'Infectious Bronchitis vaccination is due in 5 days',
        userId: farmer1.id,
        farmId: farm1?.id,
      },
      {
        type: NotificationType.CHAT_MESSAGE,
        title: 'New Message from Dr. Binod',
        body: 'You have a new message in your consultation',
        userId: farmer1.id,
      },
      {
        type: NotificationType.LOW_INVENTORY,
        title: 'Low Feed Stock',
        body: 'Feed inventory is running low. Consider restocking.',
        userId: farmer1.id,
      },
    ],
  });

  // 12. Create a consignment request from company to dealer
  console.log('Creating consignment request...');
  const consignment = await prisma.consignmentRequest.create({
    data: {
      requestNumber: 'CNS-2024-001',
      direction: ConsignmentDirection.COMPANY_TO_DEALER,
      status: ConsignmentStatus.CREATED,
      totalAmount: 50000,
      notes: 'Feed delivery request',
      fromCompanyId: companyUser.company!.id,
      toDealerId: dealerUser1.dealer!.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Created users:');
  console.log(`Super Admin: ${superAdmin.phone} (password: password123)`);
  console.log(`Company: ${companyUser.phone} (password: password123)`);
  console.log(`Dealer 1: ${dealerUser1.phone} (password: password123)`);
  console.log(`Dealer 2: ${dealerUser2.phone} (password: password123)`);
  console.log(`Doctor: ${doctorUser.phone} (password: password123)`);
  console.log(`Farmer 1: ${farmer1.phone} (password: password123)`);
  console.log(`Farmer 2: ${farmer2.phone} (password: password123)`);
  console.log(`Farmer 3: ${farmer3.phone} (password: password123)`);
  console.log(`Manager: ${managerUser.phone} (password: password123)`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });