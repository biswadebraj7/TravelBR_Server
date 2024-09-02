const express = require('express')
const app = express()
require('dotenv').config()

const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe= require('stripe')(process.env.STRIPE_API_KEY)
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 8000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}


const uri = `mongodb+srv://user:Biswadeb50@cluster0.gkua5x0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// const uri= "mongodb://localhost:27017";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const roomCollection= client.db("stayvista").collection("rooms")
    const userCollection= client.db("stayvista").collection("users")
    const bookingCollection= client.db("stayvista").collection("bookings")

    app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
              expiresIn: '365d',
            })
            res
              .cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
              })
              .send({ success: true })
          })
    const adminverfiy=async(req, res, next)=>{
      console.log("hello")
      const user=req.body;
      const query={email:user?.email}
      const result= await userCollection.findOne(query);
      console.log( result?.role)
      if(!result || result?.role !=='admin')
        return res.status(4021).send({message:"forbbiden access"})
      next()
    }
    const GuestVerfiy=async(req, res, next)=>{
      console.log("hello")
      const user=req.body;
      const query={email:user?.email}
      const result= await userCollection.findOne(query);
      console.log( result?.role)
      if(!result || result?.role !=='guest')
        return res.status(4021).send({message:"forbbiden access"})
      next()
    }
    const HostVerfiy=async(req, res, next)=>{
      console.log("hello")
      const user=req.body;
      const query={email:user?.email}
      const result= await userCollection.findOne(query);
      console.log( result?.role)
      if(!result || result?.role !=='admin')
        return res.status(401).send({message:"forbbiden access"})
      next()
    }
 //get ll user
 app.get("/user", async(req, res)=>{
  const result= await userCollection.find().toArray();
  res.send(result);
 })
//user spfici user code
   app.get('/user/:email', async(req, res)=>{
    const email=req.params.email;
    const result= await userCollection.findOne({email})
    res.send(result)
   })

//put save 
app.put("/user", async(req, res)=>{
  const user=req.body;
  const query={email: user?.email};
  const isExist= await userCollection.findOne(query);
  if(isExist){
    if(isExist.status='Resquested'){
      const result= await userCollection.updateOne(query,{
        $set:{status: user?.status}
      })
      return res.send(result)

    }else{
      return res.send(isExist)
    }
  }

    const options={ upsert:true }
  const updateDoc={
    $set:{
      ...user,
      timestamp: Date.now(),
    }
  }
  const result=await userCollection.updateOne(query, updateDoc,options);
  res.send(result);
})
//update the role
app.patch("/user/update/:email", async(req, res)=>{
  const user=req.body;
  const email=req.params.email;
  const query={email}
  const updateDoc={
    $set:{
      ...user,
      timestamp: Date.now()
    }
  }
  const result= await userCollection.updateOne(query, updateDoc);
  res.send(result);
})
// the make with patch query 
app.patch("/user", async(req, res)=>{
  const user= req.body;
  const query={email: user?.email};
  const options ={ upsert: true}
  const updateDoc={
    $set:{
      ...user,
      timestamp: Date.now()
    }
  }
  const result= await userCollection.updateOne(query, updateDoc, options);
  res.send(result)

})
///create-payment-intent
app.post("/create-payment-intent",  async(req,res)=>{
  const price=req.body.price
  const priceCent= parseFloat(price)*100;
  const {client_secret}= await stripe.paymentIntents.create({
    amount:priceCent,
    currency: "usd",
       // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
       automatic_payment_methods: {
        enabled: true,
      },
  })
  res.send({clientSecret:client_secret})
  
})

//end code of userCollection
   //get all room from db
    app.get("/rooms",  async(req, res)=>{
      const category= req.query.category;
      console.log(category)
      let query={};
      if(category && category !=='null') query={category}
      
      const result= await roomCollection.find(query).toArray();
      res.send(result)
    })
    //get user room booking only list
    app.get("/rooms/:email", async( req, res)=>{
      const email=req.params.email;
      let query={'host.email':email}
      const result= await roomCollection.find(query).toArray();
      res.send(result)

    })
    //delete room
    app.delete("/rooms/:id", async(req, res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result= await roomCollection.deleteOne(query);
      res.send(result)
    })

    //addroom use post method
    app.post("/room", async( req, res)=>{
      const query= req.body;
      // const emailExist= req.params.email;
      // if(!emailExist) return
      const result= await roomCollection.insertOne(query)
      res.send(result)
    })
    //find room detail
    app.get("/room/:id", async(req, res)=>{
      const id=req.params.id;
      const query= {_id: new ObjectId(id)};
      const result= await roomCollection.findOne(query);
      res.send(result);
    })
//bookings collection rate
app.post("/booking", async(req, res)=>{
  const bookingData=req.body;
  const result= await bookingCollection.insertOne(bookingData);
  console.log(result,"result")
//change the room avaiable status
// const roomId= bookingData.roomId;
// const query={_id: new ObjectId(roomId)}
// const updateDoc={
//   $set:{book:true}
// }
// const updatedroom= await bookingCollection.updateOne(query, updateDoc);
// console.log(updatedroom)

  res.send(result)

})
app.patch("/room/status/:id", async(req, res)=>{
  const status=req.body.status;
  const id=req.params.id;
  const query= {_id: new ObjectId(id)}
  const updateDoc={
    $set:{
      booked:status,

    }
  }
  const result= await bookingCollection.updateOne(query, updateDoc);
  console.log(result)
  res.send(result)
})

///get all booking fron db
app.get("/booking/:email", async(req, res)=>{
  const email=req.params.email;
  let query={email}
  const result= await bookingCollection.find(query).toArray();
  res.send(result)

})
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello from Travel BR Server..')
})

app.listen(port, () => {
  console.log(`Travel BR is running on port http://localhost:${port}`)
})

