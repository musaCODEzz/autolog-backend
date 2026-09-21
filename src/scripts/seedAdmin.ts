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

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@autolog.co.ke';
    const adminPhone = formatKenyanPhone(process.env.ADMIN_PHONE || '+254700000001');
    const adminPassword = process.env.ADMIN_PASSWORD || 'SuperAdmin2026!';

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail.toLowerCase() }, { role: 'admin' }],
    });

    if (existingAdmin) {
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      console.log(`✅ Admin password updated/synced for: ${existingAdmin.email}`);
      await mongoose.disconnect();
      return;
    }

    // Create the Super Admin (Mongoose pre-save hook will hash password once)
    const admin = await User.create({
      name: 'AutoLog Super Admin',
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
