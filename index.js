const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cli = require('nodemon/lib/cli');

//middleware
app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pkwhn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    await client.connect()
    console.log("Db is connected");
    const newCollection = client.db("computerPartsManufacturer").collection("newItems");
    const serviceCollection = client.db("computerPartsManufacturer").collection("services");
    const partsCollection = client.db("computerPartsManufacturer").collection("parts");
    const orderCollection = client.db("computerPartsManufacturer").collection("orders");
    const userCollection = client.db("computerPartsManufacturer").collection("users");

    try {
        // Getting data
        app.get("/parts", async (req, res) => {
            const query = {}
            const result = await partsCollection.find(query).toArray()
            res.send(result);
        })
        app.get("/part/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const part = await partsCollection.findOne(query);
            res.send(part)
        })
        app.get("/new", async (req, res) => {
            const query = {}
            const result = await newCollection.find(query).toArray()
            res.send(result);
        })
        app.get("/services", async (req, res) => {
            const query = {}
            const result = await serviceCollection.find(query).toArray()
            res.send(result);
        })

        app.get("/available", async (req, res) => {
            const available = req.body.available;

            const parts = await partsCollection.find().toArray()
            const query = { available: available };

            const orders = await orderCollection.find(query).toArray()

            orders.forEach(order => {
                const partsOrders = orders.filter(order => order.name === parts.name);
            })
            res.send(parts)
        })

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const order = await orderCollection.find(query).toArray();
                return res.send(order);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        });

        //Insert Data
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })


        app.get("/user", async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })
        //Update Data
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1hr' })
            res.send({ result, token })
        })

    }
    finally {
        // client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("Server Home page");
})

app.listen(port, () => {
    console.log("Server is running");
})