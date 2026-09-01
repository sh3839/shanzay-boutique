```javascript
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

const PORT = process.env.PORT || 3000;

// =============================
// FILES & FOLDERS
// =============================

const productsFile = path.join(__dirname, "data", "products.json");
const uploadDir = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(path.dirname(productsFile))) {
    fs.mkdirSync(path.dirname(productsFile), { recursive: true });
}

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, "[]");
}

// =============================
// MIDDLEWARE
// =============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================
// ADMIN PASSWORD PROTECTION
// =============================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function adminAuth(req, res, next) {

    if (!ADMIN_PASSWORD) {
        return res.status(500).send(
            "Admin password is not configured on the server."
        );
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.setHeader(
            "WWW-Authenticate",
            'Basic realm="Shanzay Boutique Admin"'
        );

        return res.status(401).send("Admin login required.");
    }

    try {

        const encoded = authHeader.split(" ")[1];
        const decoded = Buffer.from(encoded, "base64").toString("utf8");

        const separator = decoded.indexOf(":");

        if (separator === -1) {
            return res.status(401).send("Invalid login.");
        }

        const username = decoded.substring(0, separator);
        const password = decoded.substring(separator + 1);

        if (
            username !== "admin" ||
            password !== ADMIN_PASSWORD
        ) {
            res.setHeader(
                "WWW-Authenticate",
                'Basic realm="Shanzay Boutique Admin"'
            );

            return res.status(401).send("Wrong admin password.");
        }

        next();

    } catch (error) {

        console.error("Admin authentication error:", error);

        return res.status(401).send("Invalid login.");
    }
}

// =============================
// PRODUCT FUNCTIONS
// =============================

function getProducts() {

    try {

        const data = fs.readFileSync(
            productsFile,
            "utf8"
        );

        return JSON.parse(data || "[]");

    } catch (error) {

        console.error(
            "Error reading products:",
            error
        );

        return [];
    }
}

function saveProducts(products) {

    fs.writeFileSync(
        productsFile,
        JSON.stringify(products, null, 2),
        "utf8"
    );
}

// =============================
// IMAGE UPLOAD
// =============================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const filename =
            Date.now() + extension;

        cb(null, filename);
    }
});

const upload = multer({

    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// =============================
// PUBLIC PRODUCT API
// =============================

app.get("/api/products", (req, res) => {

    res.json(getProducts());

});

// =============================
// ADMIN AREA
// =============================

// Protect everything inside /admin
app.use("/admin", adminAuth);

// Admin page
app.get("/admin", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "admin",
            "index.html"
        )
    );

});

// =============================
// ADMIN IMAGE UPLOAD
// =============================

app.post(
    "/api/upload",
    adminAuth,
    upload.single("image"),
    (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    error: "No image uploaded."
                });

            }

            res.json({
                image:
                    "/uploads/" +
                    req.file.filename
            });

        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            res.status(500).json({
                error: "Image upload failed."
            });
        }
    }
);

// =============================
// ADD PRODUCT
// =============================

app.post(
    "/api/products",
    adminAuth,
    (req, res) => {

        try {

            const {
                name,
                price,
                salePrice,
                description,
                image,
                category,
                featured,
                newCollection
            } = req.body;

            if (!name || !price) {

                return res.status(400).json({
                    error:
                        "Product name and price are required."
                });

            }

            const products = getProducts();

            const newProduct = {

                id: Date.now(),

                name: name,

                price: price,

                salePrice:
                    salePrice || "",

                description:
                    description || "",

                image:
                    image || "",

                category:
                    category || "",

                featured:
                    featured === true ||
                    featured === "true",

                newCollection:
                    newCollection === true ||
                    newCollection === "true"
            };

            products.push(newProduct);

            saveProducts(products);

            res.status(201).json(
                newProduct
            );

        } catch (error) {

            console.error(
                "Add product error:",
                error
            );

            res.status(500).json({
                error:
                    "Something went wrong while adding the product."
            });
        }
    }
);

// =============================
// UPDATE PRODUCT
// =============================

app.put(
    "/api/products/:id",
    adminAuth,
    (req, res) => {

        try {

            const id =
                Number(req.params.id);

            const products =
                getProducts();

            const index =
                products.findIndex(
                    product =>
                        product.id === id
                );

            if (index === -1) {

                return res.status(404).json({
                    error:
                        "Product not found."
                });
            }

            const oldProduct =
                products[index];

            const {
                name,
                price,
                salePrice,
                description,
                image,
                category,
                featured,
                newCollection
            } = req.body;

            products[index] = {

                ...oldProduct,

                name:
                    name !== undefined
                        ? name
                        : oldProduct.name,

                price:
                    price !== undefined
                        ? price
                        : oldProduct.price,

                salePrice:
                    salePrice !== undefined
                        ? salePrice
                        : oldProduct.salePrice || "",

                description:
                    description !== undefined
                        ? description
                        : oldProduct.description || "",

                image:
                    image !== undefined
                        ? image
                        : oldProduct.image || "",

                category:
                    category !== undefined
                        ? category
                        : oldProduct.category || "",

                featured:
                    featured !== undefined
                        ? (
                            featured === true ||
                            featured === "true"
                        )
                        : oldProduct.featured || false,

                newCollection:
                    newCollection !== undefined
                        ? (
                            newCollection === true ||
                            newCollection === "true"
                        )
                        : oldProduct.newCollection || false
            };

            saveProducts(products);

            res.json(
                products[index]
            );

        } catch (error) {

            console.error(
                "Update product error:",
                error
            );

            res.status(500).json({
                error:
                    "Something went wrong while updating the product."
            });
        }
    }
);

// =============================
// DELETE PRODUCT
// =============================

app.delete(
    "/api/products/:id",
    adminAuth,
    (req, res) => {

        try {

            const id =
                Number(req.params.id);

            const products =
                getProducts();

            const product =
                products.find(
                    item =>
                        item.id === id
                );

            if (!product) {

                return res.status(404).json({
                    error:
                        "Product not found."
                });
            }

            const updatedProducts =
                products.filter(
                    item =>
                        item.id !== id
                );

            saveProducts(
                updatedProducts
            );

            // Delete image
            if (
                product.image &&
                product.image.startsWith(
                    "/uploads/"
                )
            ) {

                const imagePath =
                    path.join(
                        uploadDir,
                        path.basename(
                            product.image
                        )
                    );

                if (
                    fs.existsSync(
                        imagePath
                    )
                ) {

                    try {

                        fs.unlinkSync(
                            imagePath
                        );

                    } catch (imageError) {

                        console.log(
                            "Could not delete image:",
                            imageError.message
                        );
                    }
                }
            }

            res.json({
                message:
                    "Product deleted successfully."
            });

        } catch (error) {

            console.error(
                "Delete product error:",
                error
            );

            res.status(500).json({
                error:
                    "Something went wrong while deleting the product."
            });
        }
    }
);

// =============================
// PUBLIC WEBSITE
// =============================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});

// =============================
// STATIC FILES
// =============================

// Public files
app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// =============================
// START SERVER
// =============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Shanzay Boutique is running on port ${PORT}`
        );

    }
);
```
