/**
 * Simple Database Connection Test for Signalist
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

function log(message, type = 'info') {
  const colors = {
    success: '\x1b[32m',  // green
    error: '\x1b[31m',    // red
    warning: '\x1b[33m',  // yellow
    info: '\x1b[36m'      // cyan
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function testDatabaseConnection() {
  log("Testing MongoDB Connection...", 'info');

  // Check environment variables
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    log("❌ MONGODB_URI not found in .env file", 'error');
    return false;
  }
  log("✅ Environment variables loaded", 'success');

  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    log("✅ Connected to MongoDB", 'success');

    // Test basic operations
    const testCollection = mongoose.connection.db.collection("connection_test");
    
    // Insert test document
    const testDoc = { message: "Test", timestamp: new Date() };
    const insertResult = await testCollection.insertOne(testDoc);
    log("✅ Insert operation", 'success');

    // Read test document
    await testCollection.findOne({ _id: insertResult.insertedId });
    log("✅ Read operation", 'success');

    // Update test document
    await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { status: "updated" } }
    );
    log("✅ Update operation", 'success');

    // Delete test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    log("✅ Delete operation", 'success');

    // Close connection
    await mongoose.connection.close();
    log("✅ Connection closed", 'success');

    log("🎉 All tests passed! Database connection is working.", 'success');
    return true;

  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'error');
    
    if (error.name === "MongoServerError") {
      log("💡 Check: Server running? Correct credentials? IP whitelisted?", 'warning');
    } else if (error.name === "MongoNetworkError") {
      log("💡 Check: Internet connection? Server accessible?", 'warning');
    }
    
    return false;
  }
}

// Run the test
testDatabaseConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(colors.red, "❌ Unexpected error occurred:");
    log(colors.red, error.message);
    process.exit(1);
  });
