import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { formatKenyanPhone } from '../utils/phone';

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI is missing in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPhoneRaw = process.env.ADMIN_PHONE;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPhoneRaw || !adminPassword) {
      console.error('❌ SECURITY ERROR: ADMIN_EMAIL, ADMIN_PHONE, and ADMIN_PASSWORD must all be defined in your .env file!');
      console.error('   Please add them to your .env:');
      console.error('   ADMIN_EMAIL=your_admin@autolog.co.ke');
      console.error('   ADMIN_PHONE=+2547XXXXXXXX');
      console.error('   ADMIN_PASSWORD=your_strong_password');
      await mongoose.disconnect();
      process.exit(1);
    }

    const adminPhone = formatKenyanPhone(adminPhoneRaw);

    // Check if THIS specific admin already exists by email or phone
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail.toLowerCase() }, { phone: adminPhone }],
    });

    if (existingAdmin) {
      existingAdmin.password = adminPassword;
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin'; // Promote to admin if needed
      }
      await existingAdmin.save();
      console.log(`✅ Admin account updated & synced for: ${existingAdmin.email} (Role: ${existingAdmin.role})`);
      await mongoose.disconnect();
      return;
    }

    // Create the Admin account (Mongoose pre-save hook will hash password once)
    const admin = await User.create({
      name: process.env.ADMIN_NAME || 'AutoLog Administrator',
      email: adminEmail.toLowerCase(),
      phone: adminPhone,
      password: adminPassword,
      role: 'admin',
      isSuspended: false,
    });

    console.log('🎉 Super Admin created successfully!');
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Phone:    ${admin.phone}`);
    console.log(`   Role:     ${admin.role}`);
    console.log(`   ID:       ${admin._id}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
