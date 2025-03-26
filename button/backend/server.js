const express = require("express");
const multer = require("multer");
const mindee = require("mindee");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Mongoose Schema & Model
const receiptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

const Receipt = mongoose.model("Receipt", receiptSchema);

// Ensure "uploads" folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Mindee API Client
const mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

// ✅ Upload & Process Receipt
app.post("/upload", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = path.join(uploadDir, req.file.filename);

    // Parse receipt with Mindee API
    const apiResponse = await mindeeClient.parse(mindee.product.ReceiptV5, mindeeClient.docFromPath(filePath));

    // Delete the file after processing
    fs.unlinkSync(filePath);

    // Extract product names and prices
    const lineItems = apiResponse.document.inference?.prediction?.lineItems || [];

    if (lineItems.length === 0) {
      console.warn("⚠️ No line items found in the receipt.");
      return res.status(400).json({ error: "No items detected" });
    }

    const extractedItems = lineItems.map(item => ({
      name: item.description || "Unknown",
      price: item.totalAmount ? parseFloat(item.totalAmount) : 0,
    }));

    // ✅ Insert each item into MongoDB one by one
    for (const item of extractedItems) {
      await new Receipt(item).save();
      console.log(`✅ Inserted into DB: ${item.name} - ₹${item.price}`);
    }

    res.json({ message: "Receipt processed and saved successfully", items: extractedItems });

  } catch (error) {
    console.error("❌ Error Processing Receipt:", error);
    res.status(500).json({ error: "Error processing receipt", details: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
