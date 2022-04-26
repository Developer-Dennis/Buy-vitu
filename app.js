const express = require('express')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const multer = require('multer')
const session = require('express-session')
const server = require('http').createServer();
const io = require('socket.io')(server)



const app = express()
const upload = multer({ dest: './public/uploads/' })

io.on("connection", function(socket){
    socket.on('newUser', function(username){
        socket.broadcast.emit("update", username + "joined the conversation")
    })

    socket.on('exituser', function(username){
        socket.broadcast.emit("update", username + "left the conversation")
    })

    socket.on('newUser', function(username){
        socket.broadcast.emit("chat",message)
    })
})



const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'buyvitu'
})



app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: false}))


app.use(session({
    secret: 'elections',
    resave: 'false',
    saveUninitialized: 'false'
}))


app.use((req,res,next) => {
    if(req.session.userId === undefined){
        res.locals.isLoggedIn = false
    } else {
        res.locals.isLoggedIn = true
        res.locals.userId = req.session.userId
        res.locals.username = req.session.username
    }
    next()
})



app.get('/', (req, res) => {
    res.render('home.ejs')
})



app.get('/signup',(req,res) => {
    let user = {
        email: '',
        fullname: '',
        gender: '',
        password: '',
        confirmPassword: ''
    }
    res.render('signup.ejs', {error:false, user: user})
})


app.post('/signup',(req,res) => {
    let user = {
        email: req.body.email,
        fullname: req.body.fullname,
        gender: req.body.gender,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }
    if(user.password === user.confirmPassword) {
        connection.query(
            'SELECT email FROM users WHERE email = ?', [user.email],
            (error, results) => {
                if(results.length === 0) {
                    bcrypt.hash(user.password, 10, (error, hash) => {
                        connection.query(
                            'INSERT INTO users (email, fullname, gender, password) VALUES (?,?,?,?)',
                            [user.email, user.fullname, user.gender, hash],
                            (error, results) => {
                                res.redirect('/')
                            }
                        )
                    })
                } else {
                    let message = 'Email already exists.'
                    res.render('signup.ejs', {error: true, message: message, user: user})
                }
            }
        )
    } else {
        let message = 'Password & Confirm Password do not match.'
        console.log(user)
        res.render('signup.ejs', {error: true, message: message, user: user})
    }
})






app.get('/login',(req, res) => {
    let user = {
        email: '',
        password: ''
    }
    res.render('login.ejs', {error:false, user:user})
})


app.post('/login',(req,res) => {
    let user = {
        email: req.body.email,
        password: req.body.password
    }
    connection.query(
        'SELECT * FROM users WHERE email = ?', [user.email],
        (error, results) => {
            if (results.length > 0) {
                bcrypt.compare(user.password, results[0].password, (error, isEqual) => {
                    if(isEqual) {
                        req.session.userId = results[0].id
                        req.session.username = results[0].fullname.split(' ')[0].toLowerCase()
                        // console.log(req.session)
                        res.redirect('/products')
                    } else {
                        let message = 'Email/Password mistmatch.'
                        res.render('login.ejs', {error: true, message: message, user: user})
                    }
                })

            } else {
                let message = 'Account does not exist. Please create one'
                res.render('login.ejs', {error: true, message: message, user: user})
            }
        }
    )    


})









app.get('/products', (req, res) => {
    connection.query(
        'SELECT * FROM products',
        (error,results) => {
            res.render('products.ejs',{products:results})
        }
        
    )
   
})




app.get('/add-listing', (req, res) => {
   

    res.render('add-listing.ejs')
})



app.post('/add-listing', upload.single('image'), function (req, res, next) {
   connection.query(
       'INSERT INTO products (title,description,price,phonenumber,location,imageURL) VALUES(?,?,?,?,?,?)',
       [req.body.title,req.body.description,req.body.price,req.body.phonenumber,req.body.location,req.file.filename],
       (error, results) => {
           res.redirect('/products')
       }
   )
})





app.get('/edit/:id', (req, res) => {
    if(res.locals.isLoggedIn){
        connection.query(
            'SELECT * FROM products WHERE id = ? and userID = ?',
            [req.params.id, req.session.userId],
            (error, results) => {
                console.log(results)
                res.render('edit-product.ejs', {product:results[0]})
            } )
        } 
           else {
               res.redirect('/login')
               
       }   
})




app.post('/edit/:id', (req, res) => {
    connection.query(
        'UPDATE products SET title = ?, description, price = ?, phonenumber = ?, location = ?, imageURL = ? WHERE id= ? AND userId =?',
        [req.body.title, req.body.description, req.body.price, req.body.phonenumber, req.body.location, req.body.imageURL, req.params.id, req.session.userId],
        (error, results) => {
            res.redirect('/products');
        }
    )
})


app.post('/delete/:id', (req, res) => {
    if(res.locals.isLoggedIn){
        connection.query(
            'DELETE FROM products WHERE id = ?',
            [req.params.id],
            (error, results) => {
                res.redirect('/products');
            }
        )
    }else {
        res.redirect('/products');
    }
})








app.get('/contact-seller', (req, res) => {
    res.render('contact-seller.ejs')
})




app.get('/logout', (req,res) => {
    req.session.destroy((error) => {
        res.redirect('/')
    })
})











const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Server up on PORT ${PORT}`)
})