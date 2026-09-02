const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

const productsFile = path.join(__dirname, "data", "products.json");

// Create upload folder if it doesn't exist
const uploadDir = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Image upload settings
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);
        const filename = Date.now() + extension;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// Get products
function getProducts() {
    if (!fs.existsSync(productsFile)) {
        fs.writeFileSync(productsFile, "[]");
    }

    return JSON.parse(
        fs.readFileSync(productsFile, "utf8")
    );
}

// Save products
function saveProducts(products) {
    fs.writeFileSync(
        productsFile,
        JSON.stringify(products, null, 2)
    );
}

// Get all products
app.get("/api/products", (req, res) => {
    res.json(getProducts());
});

// Upload image
app.post("/api/upload", upload.single("image"), (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            error: "No image uploaded."
        });
    }

    res.json({
        image: "/uploads/" + req.file.filename
    });
});

// Add product
app.post("/api/products", (req, res) => {

    const {
        name,
        price,
        description,
        image
    } = req.body;

    if (!name || !price) {
        return res.status(400).json({
            error: "Product name and price are required."
        });
    }

    const products = getProducts();

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        description: description || "",
        image: image || ""
    };

    products.push(newProduct);

    saveProducts(products);

    res.status(201).json(newProduct);
});

// Update product
app.put("/api/products/:id", (req, res) => {

    const products = getProducts();

    const product = products.find(
        product => product.id === Number(req.params.id)
    );

    if (!product) {
        return res.status(404).json({
            error: "Product not found."
        });
    }

    const {
        name,
        price,
        description,
        image
    } = req.body;

    if (!name || !price) {
        return res.status(400).json({
            error: "Product name and price are required."
        });
    }

    product.name = name;
    product.price = price;
    product.description = description || "";

    if (image) {
        product.image = image;
    }

    saveProducts(products);

    res.json(product);
});

// Delete product
app.delete("/api/products/:id", (req, res) => {

    const products = getProducts();

    const updatedProducts = products.filter(
        product => product.id !== Number(req.params.id)
    );

    saveProducts(updatedProducts);

    res.json({
        message: "Product deleted successfully."
    });
});

// Website
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});
app.listen(PORT, '0.0.0.0', () => {
    console.log('Shanzay Boutique is running on port ' + PORT);
});
