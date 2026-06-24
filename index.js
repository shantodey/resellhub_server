const { MongoClient, ServerApiVersion } = require('mongodb');
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

    const db=client.db("ReSellHub");
    const productCollection=db.collection('product');
    const ordersCollection=db.collection('orders');
    const reviewsCollection=db.collection('reviews');
    const paymentsCollection=db.collection('payments');
    

    app.post("/app/product",async(req,res)=>{
        console.log(req.body);
        const{title,category,condition,price,images,description,sellerInfo}=req.body;
        const addData={
            title,category,condition,price,images,description,sellerInfo ,
            createdAt:new Date(),
            status:"active"
        };
        const result = await productCollection.insertOne(addData);
        return res.send(result);
    })




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