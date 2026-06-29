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



        // getting all the user form the databse for herosection 
        app.get("/app/admin/users", async (req, res) => {
            try {
                const users = await userCollection.find({}).sort({ createdAt: -1 }).toArray();
                res.status(200).send(users);
            } catch (error) {
                console.error("Backend Error:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // api for getting all prodect data && searching paginatin and more
        app.get("/app/product", async (req, res) => {
            try {
                const { search, category, sort } = req.query;
                console.log(req.query);
                const {page=1,limit=8}=req.query;
                const skip =(Number(page)-1)*(Number(limit));
                let query = {};
                if (search && search.trim() !== "") {
                    query.title = { $regex: search.trim(), $options: 'i' };
                }
                if (category && category.trim() !== "") {
                    query.category = category.trim();
                }
                let result = await productCollection.find(query).skip(skip).limit(Number(limit)).toArray();
                const totlaData= await productCollection.countDocuments();
                const totalProdect= await productCollection.countDocuments();
                const totalPage=Math.ceil(totlaData/Number(limit))
                if (sort === 'price-low') {
                    result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
                } else if (sort === 'price-high') {
                    result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
                }
                res.send({data:result, page:Number(page),totalPage,totalProdect});
            } catch (error) {
                res.status(500).send({ message: "Error fetching products" });
            }
        });

        // Get only the latest 3 products
        app.get("/app/latest-products", async (req, res) => {
            try {
                const result = await productCollection
                    .find({})
                    .sort({ createdAt: -1 })
                    .limit(3)
                    .toArray();

                res.send(result);
            } catch (error) {
                console.error("Backend Error:", error);
                res.status(500).send({ message: "Error fetching latest products" });
            }
        });

        // API power getting data product delivery data
        app.get("/app/all-orders", async (req, res) => {
            try {
                const result = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
                res.status(200).send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching all orders" });
            }
        });







        // seller api


        // api for sending new product data to database
        app.post("/app/product", async (req, res) => {
            console.log(req.body);
            const { title, category, condition, price, quantity, images, description, sellerInfo } = req.body;
            const addData = {
                title, category, condition, price, quantity, images, description, sellerInfo,
                createdAt: new Date(),
                status: "pending"
            };
            const result = await productCollection.insertOne(addData);
            return res.send(result);
        })

        // apr for showing seller which of them are his order 
        app.get("/app/seller/orders", async (req, res) => {
            try {
                const { email } = req.query;
                if (!email) { return res.status(400).send({ message: "Seller email is required" }); }
                const query = {
                    "sellerInfo.email": { $regex: `^${email.trim()}$`, $options: 'i' },
                    orderStatus: { $in: ["pending", "accepted", "verified", "processing", "shipped"] }
                };
                const orders = await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(orders);
            } catch (error) {
                console.error("Fetch Seller Orders Error:", error);
                res.status(500).send({ message: "Error fetching orders" });
            }
        });

        //  api for Chang order status in Every single step 
        app.post("/app/seller/orders/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { action } = req.body;
                let nextStatus = "";
                if (action === "process") nextStatus = "processing";
                else if (action === "ship") nextStatus = "shipped";
                else if (action === "deliver") nextStatus = "delivered";
                else return res.status(400).send({ message: "Invalid action" });

                const result = await ordersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { orderStatus: nextStatus, updatedAt: new Date() } }
                );

                res.send(result);
            } catch (error) {
                console.error("Update Seller Order Error:", error);
                res.status(500).send({ message: "Action failed" });
            }
        });








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
                const userEmail = req.query.email;
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


        // api for creating a new order (With Quantity & Total Price)
        app.post("/app/orders", async (req, res) => {
            try {
                const orderData = {
                    ...req.body,
                    createdAt: new Date()
                };

                const result = await ordersCollection.insertOne(orderData);
                res.status(201).send({ success: true, orderId: result.insertedId });
            } catch (error) {
                res.status(500).send({ success: false, message: "Internal Server Error" });
            }
        });

        // API to get orders for a specific buyer using email query
        app.get("/app/orders", async (req, res) => {
            try {
                const { email } = req.query;
                if (!email) {
                    return res.status(400).send({ success: false, message: "Email parameter is required" });
                }
                const query = { "buyerInfo.email": email };
                const result = await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();

                res.send({ success: true, orders: result });
            } catch (error) {
                console.error("Fetch Orders Error:", error);
                res.status(500).send({ success: false, message: "Error fetching checkout orders" });
            }
        });


        //api for updating Payment status up the successful payment
        app.patch("/app/orders/update-status", async (req, res) => {
            try {
                const { email } = req.query;
                if (!email) {
                    return res.status(400).send({ success: false, message: "Email is required" });
                }
                const query = {
                    "buyerInfo.email": email,
                    paymentStatus: "unpaid"
                };

                const updateDoc = {
                    $set: {
                        paymentStatus: "paid",
                        orderStatus: "verified"
                    }
                };
                const result = await ordersCollection.updateMany(query, updateDoc);
                res.send({
                    success: true,
                    message: "Payment status updated successfully",
                    modifiedCount: result.modifiedCount
                });
            } catch (error) {
                console.error("Update Payment Status Error:", error);
                res.status(500).send({ success: false, message: "Internal Server Error" });
            }
        });










        // admin stef 

        // Admin Dashboard Overview API (Total Counts)
        app.get("/app/admin/overview", async (req, res) => {
            try {
                const [totalUsers, totalOrders] = await Promise.all([
                    db.collection('account').estimatedDocumentCount(),
                    db.collection('orders').estimatedDocumentCount()
                ]);

                res.send({
                    success: true,
                    data: {
                        totalUsers,
                        totalOrders
                    }
                });
            } catch (error) {
                console.error("Admin Overview Fetch Error:", error);
                res.status(500).send({ success: false, message: "Internal Server Error" });
            }
        });

        // api for the admin to to rivew The product 
        app.get("/app/admin/products", async (req, res) => {
            const products = await productCollection.find({}).sort({ createdAt: -1 }).toArray();
            res.send(products);
        });


        // aPI for the admin to reject delete the product
        app.post("/app/admin/product-action/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { action } = req.body;

                const query = { _id: new ObjectId(id) };
                if (action === "delete") {
                    const result = await productCollection.deleteOne(query);
                    return res.send(result);
                }
                if (action === "approve" || action === "reject") {
                    const statusValue = action === "approve" ? "approved" : "rejected";
                    const result = await productCollection.updateOne(
                        query,
                        { $set: { status: statusValue, updatedAt: new Date() } }
                    );
                    return res.send(result);
                }

                res.status(400).send({ message: "Invalid action type" });
            } catch (error) {
                console.error("Backend Action Error:", error);
                res.status(500).send({ message: "Action failed" });
            }
        });


        // api for admin serching throue user
        app.get("/app/admin/users", async (req, res) => {
            try {
                const search = req.query.search?.trim();
                const query = search ? {
                    $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
                } : {};

                const users = await userCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(users);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // API for admin Deleting or blocking user
        app.all("/app/admin/user-action/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { actionType } = req.query;
                const query = { _id: new ObjectId(id) };

                if (actionType === 'delete') {
                    const result = await userCollection.deleteOne(query);
                    return res.status(result.deletedCount ? 200 : 404).send({ success: !!result.deletedCount, message: result.deletedCount ? "Deleted" : "Not found" });
                }

                if (actionType === 'update') {
                    const result = await userCollection.updateOne(query, { $set: { ...req.body, updatedAt: new Date() } });
                    return res.status(result.matchedCount ? 200 : 404).send({ success: !!result.matchedCount, message: result.matchedCount ? "Updated" : "Not found" });
                }

                res.status(400).send({ success: false, message: "Invalid action" });
            } catch (error) {
                res.status(500).send({ success: false, message: "Server Error" });
            }
        });

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