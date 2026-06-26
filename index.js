const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());





const uri = process.env.MONGODB_URI;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const db = client.db("ReSellHub");
        const productCollection = db.collection('product');
        const ordersCollection = db.collection('orders');
        const reviewsCollection = db.collection('reviews');
        const paymentsCollection = db.collection('payments');
        const userCollection = db.collection('user');

        // api for getting prodect data && searching 
        app.get("/app/product", async (req, res) => {
            try {
                const { search, category, sort } = req.query;
                let query = {};
                if (search && search.trim() !== "") {
                    query.title = { $regex: search.trim(), $options: 'i' }; 
                }
                if (category && category.trim() !== "") {
                    query.category = category.trim();
                }
                let result = await productCollection.find(query).toArray();
                if (sort === 'price-low') {
                    result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0)); 
                } else if (sort === 'price-high') {
                    result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0)); 
                }
                res.send(result);
            } catch (error) {
                console.error("Backend Error:", error);
                res.status(500).send({ message: "Error fetching products" });
            }
        });

        // api for sending new product data to database
        app.post("/app/product", async (req, res) => {
            console.log(req.body);
            const { title, category, condition, price, quantity, images, description, sellerInfo } = req.body;
            const addData = {
                title, category, condition, price, quantity, images, description, sellerInfo,
                createdAt: new Date(),
                status: "active"
            };
            const result = await productCollection.insertOne(addData);
            return res.send(result);
        })
        
        // api for updeting data for prodect
        app.put("/app/product/:id", async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            try {
                const result = await productCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedData }
                );
                if (result.modifiedCount === 1) {
                    res.send({ success: true, message: "Product updated successfully" });
                } else {
                    res.send({ success: false, message: "No changes made or product not found" });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: "Error updating product" });
            }
        });

        // api for deleting prodect data
        app.delete("/app/product/:id", async (req, res) => {
            const { id } = req.params;
            try {
                const result = await productCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    res.send({ success: true, message: "Product deleted successfully" });
                } else {
                    res.status(404).send({ success: false, message: "Product not found" });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ success: false, message: "Error deleting product" });
            }
        });

        // api for getting Individual prodect data 
        app.get("/app/product/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await productCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: "Product not found" });
                }

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Error fetching product details" });
            }
        });

        // for getting all the prodect listed by seller
        app.get("/app/my-products", async (req, res) => {
            try {
                const userEmail = req.query.email; // ক্লায়েন্ট থেকে আসা ইমেইল
                if (!userEmail) {
                    return res.status(400).send({ message: "Email is required" });
                }
                const query = { "sellerInfo.email": userEmail };
                const result = await productCollection.find(query).toArray();

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Error fetching user products" });
            }
        });



        // api for updating profile
        app.patch("/app/user", async (req, res) => {
            const { email, name, image } = req.body;
            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }
            const updateDoc = {
                $set: {
                    ...(name && { name: name.trim() }),
                    ...(image && { image }),
                    updatedAt: new Date()
                }
            };
            try {
                const result = await userCollection.updateOne({ email }, updateDoc);
                if (!result.matchedCount) {
                    return res.status(404).send({ message: "User not found" });
                }
                res.send({
                    message: "Profile updated successfully",
                    modifiedCount: result.modifiedCount
                });
            } catch (err) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });


        // api for getting product data with filters


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});