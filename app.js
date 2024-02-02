const express = require('express');
// const cors = require('cors');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs'); 
const MongoDBStore = require('connect-mongodb-session')(session);   // Storing sessions
// const nodemailer = require('nodemailer'); 
const { check, validationResult } = require('express-validator');



const app = express();
const MONGO_URI = "mongodb+srv://ritesh:qwerty1@cluster0.hodiq1h.mongodb.net/?retryWrites=true&w=majority";

app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded form data

const store = new MongoDBStore ( {
    uri: MONGO_URI,
    collection: 'sessions'
});

app.use(session({
    secret: 'this is secret',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        maxAge: 1000 * 60 * 60
    }
}))

// app.use(cors());

//Thoughts
const ThoughtSchema = new mongoose.Schema({
    thoughts: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    }
})

const SignedUsers = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

const Thought = mongoose.model('Thought', ThoughtSchema);
const Users = mongoose.model('Users', SignedUsers);

mongoose.connect(MONGO_URI)
    .then(console.log("Connected to Database"))
    .catch(err => console.log("Error: ", err))


// For weather Call
app.get('/getWeather', async (req, res) => {
    const city = req.query.city;
    const url = `https://cities-temperature.p.rapidapi.com/weather/v1?city=${encodeURIComponent(city)}`;

    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '49ca7e067amsh67d638896a19b7bp1b8e3ejsn80796db25a63',
            'X-RapidAPI-Host': 'cities-temperature.p.rapidapi.com'
        }
    };

    fetch(url, options)
        .then(res1 => res1.json())
        .then(result => {
            console.log("Fetched");
            res.render("weather.ejs", {
                data: result,
                city: city,
                loggedIn: req.session.userId
            })
        })
        .catch(err => console.log("Err: ", err));
    
})

//post data to mongodb
app.post('/postThoughts', async(req, res, next) => {
    const thoughtContent = req.body.userThoughts;
    const userId = req.session.userId;

    const thought = new Thought({thoughts: thoughtContent, user: userId});

    await thought.save()
        .then(console.log("saved"))
        .catch(err => console.log(err));

    res.redirect('/');
})

app.get('/getThoughts', async(req, res, next) => {
    const userId = req.session.userId;  

    if(!userId) {
        return res.redirect('/');
    }
    
    const thoughts = await Thought.find({user: userId})
        .catch(err => console.log(err));
    
    console.log(thoughts);

    // res.json(thoughts)
    res.render('thoughts.ejs', {
        thoughts: thoughts
    })

})

app.get('/su', (req, res) => {
    res.render('signup.ejs');
})

app.post('/signup', check('email').isEmail() ,async (req, res) => {
    const email = req.body.email;
    const password = await bcrypt.hash(req.body.password, 8);
    const errors = validationResult(req);

    const existingUser = await Users.findOne({email: email});
    if(existingUser) {
        console.log("Email already in use");
        // return res.status(400).send('Email already in use');
        return res.redirect('/weather');
    }

    const user = new Users({email: email, password: password});

    await user.save()
        .then(() => {
            console.log("User Saved");
            req.session.userId = user._id;
            res.redirect('/');
        })
        .catch(err => console.log(err));

})

app.get('/li', (req, res) => {
    res.render('login.ejs');
})

app.post('/login', async (req, res) => {
    //login logic pending

    const email = req.body.email;
    const password = req.body.password;

    // finding emails
    const user = await Users.findOne({email: email});

    if(!user) {
        console.log("No such email");
        return res.redirect('/');
    }

    // matching password
    if(await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        console.log("Logged In");
    }
    else{
        console.log("Incorrect Password");
    }
    
    res.redirect('/');

})

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    })
})

//general case
app.use('/', (req, res) => {  
    res.render('main.ejs');
})

app.listen(3002, () => {
    console.log("Server Started");
})